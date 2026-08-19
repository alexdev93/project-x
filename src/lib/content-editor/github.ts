import "server-only";

/**
 * Reading and committing one JSON file through the GitHub Contents API.
 *
 * ## Why the site's content is edited by making commits
 *
 * The content files are imported at module scope and inlined at build time,
 * which is what makes every portfolio page static with no runtime query. Three
 * of them are imported by *client* components, so they cannot become async reads
 * at all. And Vercel's filesystem is read-only at runtime, so there is nothing to
 * write to even if that were not true.
 *
 * Committing sidesteps all of it: the editor changes the same file a developer
 * would, the build validates it exactly as before, the deployment that follows
 * is a normal one, and every edit is a revertible commit with an author and a
 * message. The cost is a minute or two before the change is live, which is the
 * right trade for content that changes rarely.
 *
 * ## What this file will and will not do
 *
 * It writes to a fixed list of paths — the section registry's — and refuses
 * anything else. The token is a fine-grained personal access token scoped to
 * Contents on one repository, so even a bug here cannot reach another repo, and
 * `server-only` keeps the token out of any client bundle.
 *
 * Concurrency is handled by the API itself: an update must carry the blob SHA it
 * is replacing, and GitHub rejects a stale one with a 409. That turns "two edits
 * at once" into a clear error rather than a silent overwrite.
 */

const API = "https://api.github.com";

export class ContentEditorNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Content editing is not configured. Missing: ${missing.join(", ")}`);
    this.name = "ContentEditorNotConfiguredError";
  }
}

export type RepoConfig = {
  token: string;
  /** "owner/name". */
  repo: string;
  branch: string;
};

function read(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function missingContentEditorVars(): string[] {
  const missing: string[] = [];
  if (!read("GITHUB_TOKEN")) missing.push("GITHUB_TOKEN");
  if (!read("GITHUB_REPO")) missing.push("GITHUB_REPO");
  return missing;
}

/** False turns the editor read-only rather than hiding it: the values are still worth seeing. */
export function canCommitContent(): boolean {
  return missingContentEditorVars().length === 0;
}

function config(): RepoConfig {
  const missing = missingContentEditorVars();
  if (missing.length > 0) throw new ContentEditorNotConfiguredError(missing);

  return {
    token: read("GITHUB_TOKEN")!,
    repo: read("GITHUB_REPO")!,
    branch: read("GITHUB_BRANCH") ?? "main",
  };
}

async function call(
  path: string,
  init: RequestInit & { token: string },
): Promise<Response> {
  const { token, ...rest } = init;

  return fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
    // Never cache a repository read: the SHA it returns is what the next write
    // depends on, and a stale one turns every save into a 409.
    cache: "no-store",
  });
}

export type FileContents = {
  /** Parsed JSON. */
  data: unknown;
  /** Blob SHA, required to update the file. */
  sha: string;
};

/**
 * Read one JSON file from the repository.
 *
 * The API returns base64 with line breaks in it, which `atob` refuses — hence
 * stripping whitespace before decoding. Decoding through `Buffer` keeps
 * multi-byte characters intact; the content here includes em dashes and Amharic,
 * so a latin-1 round trip would corrupt it silently.
 */
export async function readContentFile(file: string): Promise<FileContents> {
  const { token, repo, branch } = config();

  const response = await call(
    `/repos/${repo}/contents/${encodeURIComponent(file)}?ref=${encodeURIComponent(branch)}`,
    { token, method: "GET" },
  );

  if (!response.ok) {
    throw new Error(`GitHub read failed (${response.status})`);
  }

  const payload = (await response.json()) as { content: string; sha: string };
  const text = Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString(
    "utf8",
  );

  return { data: JSON.parse(text), sha: payload.sha };
}

export type CommitResult = {
  sha: string;
  url: string;
};

/**
 * Commit a new version of one file.
 *
 * The JSON is written with two-space indentation and a trailing newline, which
 * is what the repository already uses — a save should produce the diff a person
 * would have written, not a reformat of the whole file.
 */
export async function commitContentFile({
  file,
  data,
  sha,
  message,
  author,
}: {
  file: string;
  data: unknown;
  /** The SHA being replaced. A stale one is refused by GitHub with a 409. */
  sha: string;
  message: string;
  author: { name: string; email: string };
}): Promise<CommitResult> {
  const { token, repo, branch } = config();

  const text = `${JSON.stringify(data, null, 2)}\n`;

  const response = await call(
    `/repos/${repo}/contents/${encodeURIComponent(file)}`,
    {
      token,
      method: "PUT",
      body: JSON.stringify({
        message,
        content: Buffer.from(text, "utf8").toString("base64"),
        sha,
        branch,
        // Attributed to whoever saved it, so `git log` on the content files
        // reads as a history of decisions rather than of deployments.
        committer: author,
        author,
      }),
    },
  );

  if (response.status === 409) {
    throw new Error(
      "This file changed since you opened it. Reload and reapply your edit.",
    );
  }

  if (!response.ok) {
    throw new Error(`GitHub write failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    commit: { sha: string; html_url: string };
  };

  return { sha: payload.commit.sha, url: payload.commit.html_url };
}
