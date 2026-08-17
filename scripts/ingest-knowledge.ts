/**
 * Builds the knowledge base from src/content and stores embeddings.
 *
 *   yarn ingest            # embed only what changed
 *   yarn ingest --force    # re-embed everything
 *   yarn ingest --dry-run  # show the plan, call nothing
 *
 * Idempotent. Each chunk carries a hash of its text, so re-running after an
 * unrelated content edit embeds only the chunks that actually changed — which
 * matters on a free embedding quota. Chunks whose source has been removed from
 * the content are pruned.
 */

import { buildKnowledgeChunks } from "@/lib/rag/chunking";
import { embedDocuments } from "@/lib/rag/embeddings";
import {
  countChunks,
  deleteChunksExcept,
  getChunkHashes,
  upsertChunk,
} from "@/lib/db/knowledge";
import { getAiConfig } from "@/lib/ai/config";

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const { embeddingModel, embeddingDimensions } = getAiConfig();
  const chunks = buildKnowledgeChunks();

  console.log(`Model      ${embeddingModel} @ ${embeddingDimensions}d`);
  console.log(`Chunks     ${chunks.length} built from src/content`);

  // A dry run inspects the chunk plan, so it must not need a database or a key.
  if (dryRun) {
    const chars = chunks.reduce((n, c) => n + c.content.length, 0);
    for (const chunk of chunks) {
      console.log(
        `  ${chunk.metadata.category.padEnd(10)} ${chunk.id.padEnd(34)} ` +
          `${String(chunk.content.length).padStart(5)} chars`,
      );
    }
    console.log(`\n${chunks.length} chunks, ${chars.toLocaleString()} chars total.`);
    console.log("Dry run — no database read, no embeddings requested.");
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set. See .env.example.");
    process.exit(1);
  }

  const existing = force ? new Map<string, string>() : await getChunkHashes();
  const changed = chunks.filter(
    (chunk) => existing.get(chunk.id) !== chunk.contentHash,
  );

  console.log(`Unchanged  ${chunks.length - changed.length} (skipped)`);
  console.log(`To embed   ${changed.length}`);

  if (changed.length > 0) {
    // One batched call rather than one per chunk: the model accepts up to 100
    // values, and this corpus fits in a single request.
    const embeddings = await embedDocuments(changed.map((c) => c.content));

    if (embeddings.length !== changed.length) {
      throw new Error(
        `Expected ${changed.length} embeddings, received ${embeddings.length}`,
      );
    }
    if (embeddings[0]?.length !== embeddingDimensions) {
      throw new Error(
        `Model returned ${embeddings[0]?.length}d vectors but the schema and ` +
          `config expect ${embeddingDimensions}d. Align AI_EMBEDDING_DIMENSIONS ` +
          `with the VECTOR(...) width in src/lib/db/schema.sql.`,
      );
    }

    for (const [index, chunk] of changed.entries()) {
      await upsertChunk(chunk, embeddings[index]);
      console.log(`  stored  ${chunk.id}`);
    }
  }

  const pruned = await deleteChunksExcept(chunks.map((c) => c.id));
  if (pruned > 0) console.log(`Pruned     ${pruned} stale chunk(s)`);

  console.log(`\nDone. knowledge_chunks holds ${await countChunks()} rows.`);
}

main().catch((error) => {
  console.error("\nIngestion failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
