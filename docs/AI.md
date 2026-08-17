# AI Assistant — Architecture

The portfolio assistant: a tool-using agent over Gemini, grounded in the
portfolio content, with pgvector retrieval powering source citations.

---

## 1. The decision that shapes everything

Measured before any code was written:

```
Knowledge corpus:   18,613 bytes JSON  →  ~3,363 tokens
Model input window:                        1,048,576 tokens
Corpus occupies:                           0.32%
```

RAG exists to select a subset of a corpus that will not fit in context. **This
corpus is 1/300th of the window.** Retrieving top-K chunks instead of sending
everything could only *remove* information the model would otherwise have — so
classic RAG would make answers equal or worse here, not better.

So the architecture splits the two jobs retrieval usually does:

| Job | How it is done here |
|---|---|
| Give the model the facts | Full portfolio context in the system prompt |
| Identify what an answer drew on | pgvector similarity search → `sources[]` |

This is a real RAG pipeline — chunking, embeddings, a vector store, semantic
search, an idempotent ingestion process — used for the job it can actually win
at today. **Retrieval is an enhancement, never a dependency:** if the database is
cold, missing, or over quota, the answer still streams and citations are omitted.

When the corpus outgrows the window, `buildContext` in `lib/rag/retrieval.ts` is
the single place that switches to top-K truncation.

---

## 2. Request flow

```
                          USER
                            │
                    ChatPanel (client)
                    useChat hook
                            │  POST /api/ai/chat
                            ▼
              ┌──────────────────────────────┐
              │  route.ts                    │
              │  1. rate limit  (per IP)     │
              │  2. zod validate + size cap  │
              │  3. cache lookup ────────────┼──► HIT ──► stream cached answer
              │  4. key present?             │
              └──────────────┬───────────────┘
                             │ MISS
                             ▼
              ┌──────────────────────────────┐
              │  agent.ts                    │
              │  system prompt = FULL context│
              │  tools + max 5 steps         │
              └──────────────┬───────────────┘
                             │
              ┌──────────────┴───────────────┐
              │                              │
              ▼                              ▼
      ┌────────────────┐            ┌──────────────────┐
      │ searchKnowledge│            │ getProjects      │
      │                │            │ getProject       │
      │  embedQuery    │            │ getExperience    │
      │       │        │            │ getSkills        │
      │       ▼        │            │ getAbout         │
      │  pgvector      │            │ getContact       │
      │  cosine search │            │                  │
      └───────┬────────┘            └────────┬─────────┘
              │ chunks + sources              │ structured content
              └──────────────┬────────────────┘
                             ▼
                          Gemini
                             │  streamText
                             ▼
              text/plain stream
              "answer…\n__SOURCES__{json}"
                             │
                             ▼
              useChat strips the tail each tick
              ChatPanel renders answer + citation chips
```

Order matters: the cheapest rejection runs first, and a cache hit never reaches
Gemini.

---

## 3. Modules

```
src/lib/ai/
  config.ts              every AI env var, zod-validated, one place
  context.ts             serialises src/content into the grounding context
  agent/
    agent.ts             streamText + tools + step budget
    tools.ts             the model's ENTIRE capability surface
    types.ts             wire format, sentinel parsing
  prompts/
    portfolio.ts         system prompt + injection guardrails

src/lib/rag/
  types.ts               KnowledgeChunk, RetrievedChunk, Source
  chunking.ts            structure-aware chunking + hashing
  embeddings.ts          embedQuery / embedDocuments (asymmetric task types)
  retrieval.ts           best-effort semantic search

src/lib/db/
  schema.sql             knowledge_chunks + pgvector
  client.ts              Neon HTTP driver, vector literal helper
  knowledge.ts           the ONLY module that writes SQL

src/lib/cache/
  ai-cache.ts            normalised-question cache, TTL, LRU bound

src/app/api/ai/chat/route.ts    the API boundary
scripts/db-migrate.ts           yarn db:migrate
scripts/ingest-knowledge.ts     yarn ingest
```

The earlier non-agent path (`lib/ai/provider.ts`, `gemini.ts`, `prompt.ts` and
`/api/chat`) was removed once the agent superseded it — two implementations of
the same thing is a maintenance cost with no upside, and the unused endpoint was
an extra public surface to protect.

---

## 4. Setup

### 4.1 Gemini key

```bash
cp .env.example .env.local
# paste your key into GEMINI_API_KEY
```

Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
It is read only inside `src/lib/ai/**` and `src/lib/rag/embeddings.ts`, both
server-only. It is never a `NEXT_PUBLIC_` variable, never returned in a
response, and never logged.

**The assistant works at this point.** Everything below adds citations.

### 4.2 Postgres + pgvector (optional)

Any Postgres with the `vector` extension works. Neon's free tier is sufficient:

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string into `DATABASE_URL` in `.env.local`.
3. Apply the schema and ingest:

```bash
yarn db:migrate     # CREATE EXTENSION vector + knowledge_chunks
yarn ingest         # chunk, embed, store
```

`CREATE EXTENSION IF NOT EXISTS vector` is in the schema, so pgvector needs no
separate setup on Neon or Supabase.

### 4.3 Ingestion

```bash
yarn ingest             # embed only chunks whose content changed
yarn ingest --force     # re-embed everything
yarn ingest --dry-run   # print the chunk plan; no database, no API calls
```

Idempotent. Each chunk stores a SHA-256 of its text, so editing one project
re-embeds one chunk rather than all 21 — which matters on a free embedding
quota. Chunks whose source has been removed from the content are pruned.

Re-run it whenever `src/content/*.json` changes.

---

## 5. Chunking

Structural, not mechanical. The content is already organised into meaningful
units, so each becomes one chunk:

| Source | Chunks | Category |
|---|---|---|
| `profile.json` | bio, focus areas, contact | `profile`, `contact` |
| `experience.json` | one per role | `experience` |
| `projects.json` | one per project | `project` |
| `skills.json` | one per group | `skills` |
| `education.json` | one combined | `education` |

21 chunks, ~11,000 characters, median 488 chars.

Two rules:

- **Every chunk repeats its own heading.** A chunk is retrieved alone, without
  its neighbours, so it has to be independently meaningful. Splitting on a
  character count would separate a role's responsibilities from its employer and
  dates — exactly the context needed to answer.
- **Unwritten fields are omitted, not emptied.** An empty `## Problem` heading
  would let the model read the gap as a fact about the work rather than an
  unfinished write-up.

Metadata per chunk: `{ source, category, title, url }`.

---

## 6. Retrieval

```
question → embedQuery (RETRIEVAL_QUERY) → pgvector cosine → threshold → sources
```

- **Asymmetric embeddings.** Documents embed with `RETRIEVAL_DOCUMENT`, queries
  with `RETRIEVAL_QUERY`. The model places a passage and a question about it in
  different regions unless told which is which.
- **`1 - (embedding <=> query)`** converts pgvector's cosine *distance* to a
  similarity, which is what `RAG_MIN_SCORE` thresholds against.
- **No ANN index.** HNSW/IVFFlat pay off in the thousands of rows; this table has
  21. An exact sequential scan is faster here *and* accurate. Revisit past ~5k.
- **Bounded and best-effort.** A 4s timeout, and every failure path returns no
  sources instead of raising. Free-tier Postgres autosuspends, so "the database
  is asleep" is a normal condition, not an incident.

---

## 7. The agent

Not a passthrough. The model gets tools and up to **5 steps**, so it can look
something up, read the result, and look up more before answering.

| Tool | Purpose |
|---|---|
| `searchKnowledge` | Semantic search; open or comparative questions |
| `getProjects` | List/filter by category or technology |
| `getProject` | Full detail for one slug |
| `getExperience` | Roles, newest first; filterable by technology |
| `getSkills` | Grouped skills with depth bands |
| `getAbout` | Bio, positioning, focus areas, education |
| `getContact` | Contact details |

`searchArticles` is deliberately absent — there is no writing collection yet, and
a tool that queries an empty set is worse than no tool.

**"Which project best demonstrates backend experience?"** →
`getProjects({ category: "backend" })` → `getProject` on the candidates →
compare stack, role and architecture → answer citing the winner.

---

## 8. Caching

```
question → normalise (case, spacing, trailing punctuation) → sha256(model|topK|q)
        → hit? serve      miss? run agent, then store
```

- **First turns only.** Once there is history the answer depends on it, so a
  question-only key would serve the wrong conversation's reply.
- **Model and top-K are in the key** — changing either changes the answer, and a
  stale entry would be wrong.
- **Empty answers are never stored**, or a transient failure would be pinned for
  the whole TTL.
- **In-process, LRU-bounded at 200.** On serverless each instance keeps its own
  copy and a cold start begins empty. That is the right trade at this size: no
  extra service, no cross-visitor leakage, and a miss costs only what the
  request would have cost anyway. A shared cache would swap free infrastructure
  for a paid dependency to save a handful of model calls.

`AI_CACHE_TTL=0` disables it.

---

## 9. Rate limiting and abuse protection

| Control | Default | Variable |
|---|---|---|
| Requests per window per IP | 10 | `AI_RATE_LIMIT` |
| Window | 60s | `AI_RATE_WINDOW` |
| Max message length | 2,000 chars | `AI_MAX_MESSAGE_LENGTH` |
| Max history | 20 turns | `AI_MAX_HISTORY` |
| Upstream timeout | 30s | `AI_TIMEOUT_MS` |
| Agent step budget | 5 | `MAX_STEPS` in `agent.ts` |

Also: `Content-Length` is rejected above `maxMessageLength × maxHistory × 2`
before the body is parsed, and `robots.txt` disallows `/api/`.

The limiter is per-instance in memory, so on serverless it is an abuse dampener
rather than a strict global quota — enough to stop one client hammering the
endpoint, which is the threat a public portfolio actually has. Swap the store in
`lib/rate-limit.ts` for a shared one if that changes.

---

## 10. Security

| Risk | Mitigation |
|---|---|
| Key exposure | Read only in server modules; never `NEXT_PUBLIC_`, never returned, never logged. A test asserts the prompt contains no key-shaped string |
| Prompt injection | Context is fenced and labelled reference data; the prompt instructs the model to ignore instructions inside it. Asserted by test |
| Unrestricted data access | The model has no SQL. Every tool is a typed function with constrained inputs; a test asserts no tool takes a free-form query/path/table parameter |
| Tool abuse | 5-step budget, bounded inputs, rate limit |
| Path traversal via slug | `getProject` looks up an exact slug in a fixed list; an unknown value returns the valid options |
| XSS / unsafe markdown | `react-markdown` with no `rehype-raw`, so embedded HTML is not rendered |
| Malicious links | External links get `rel="noopener noreferrer"`; internal paths route client-side |
| Oversized requests | `Content-Length` check before parse, plus zod length caps |
| Error leakage | Users get fixed friendly strings; Gemini and Postgres errors are logged server-side only |

Retrieved content is treated as untrusted throughout, even though it currently
originates from our own JSON — the guardrail has to hold when that stops being
true.

---

## 11. Streaming and the wire format

`text/plain` with `X-Accel-Buffering: no` so proxies do not buffer.

```
Alex works mainly in Java and Spring Boot…
__SOURCES__{"sources":[{"title":"Zemenawi CRM","type":"project","url":"/projects/zemenawi-crm"}]}
```

Sources are only known after the tools have run, so they cannot go in a header
before the stream opens. A trailing sentinel keeps the transport a plain text
stream — no SSE framing — and a client that ignores it still renders a correct
answer.

`useChat` strips the tail on *every* tick, so a partially received sentinel never
appears as literal text. If the tail is truncated, the answer the user has
already read survives and citations are simply absent.

Failure handling: mid-stream errors close the connection cleanly rather than
switching to an error status, because the user may already be reading a partial
answer — a truncated reply beats one that vanishes.

---

## 12. Testing

```bash
yarn test          # once
yarn test:watch
```

72 tests. **Gemini and Postgres are mocked everywhere** — `vitest.config.ts`
blanks `GEMINI_API_KEY` and `DATABASE_URL` so a leak fails loudly rather than
billing quota.

| Area | Covers |
|---|---|
| `chunking.test.ts` | Determinism, uniqueness, coverage, no bare headings, size ceilings |
| `retrieval.test.ts` | Success, source shape, dedup, no-DB, embed failure, DB failure, timeout, empty query |
| `tools.test.ts` | Tool surface, no free-form query params, filtering, bad slug inertness, no secrets in output |
| `portfolio.test.ts` | Injection guardrails, fabrication rules, no embedded secrets |
| `ai-cache.test.ts` | Normalisation, history refusal, empty-answer refusal, eviction |
| `rate-limit.test.ts` | Limits, isolation, window expiry, forwarded-IP parsing |
| `types.test.ts` | Sentinel parsing, truncation, malformed payloads |

---

## 13. Deployment

Vercel. Set in Project → Settings → Environment Variables:

| Variable | Required |
|---|---|
| `GEMINI_API_KEY` | Yes |
| `DATABASE_URL` | Only for citations |
| `AI_MODEL`, `RAG_TOP_K`, `AI_RATE_LIMIT`, … | No — defaults apply |

`/api/ai/chat` is `runtime = "nodejs"`, `dynamic = "force-dynamic"`. Every other
route stays static.

Neon's HTTP driver is used rather than a TCP pool: serverless functions are
short-lived and scale horizontally, and a pool per instance exhausts Postgres
connection slots.

After changing content: `yarn ingest` (locally, against the same
`DATABASE_URL`), then redeploy.

---

## 14. Cost

Everything used here has a free tier: the chat model, `gemini-embedding-001`, and
Neon. Check your own limits at
[aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit) — they
vary by account.

Ingestion embeds 21 chunks (~11k chars) and only re-embeds what changed. A chat
turn is ~3,400 input tokens plus the answer. At portfolio traffic this stays
inside free limits; if it ever doesn't, `gemini-3.5-flash-lite` is $0.30/$2.50
per million tokens.
