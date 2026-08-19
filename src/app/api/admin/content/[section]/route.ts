import { requireAdmin } from "@/lib/auth/session";
import {
  canCommitContent,
  commitContentFile,
  missingContentEditorVars,
  readContentFile,
} from "@/lib/content-editor/github";
import { SECTIONS, isSectionKey, validateSection } from "@/lib/content-editor/sections";
import {
  checkRequest,
  errorResponse,
  notFound,
  okResponse,
} from "@/lib/http/guards";

/**
 * Reading and saving one content file.
 *
 * **Validation happens before the commit, against the same zod schema the build
 * uses.** That ordering is the entire safety story of this feature: a document
 * that would fail the build is rejected here, so the repository never receives a
 * commit that breaks the site. The alternative — commit first, discover the
 * problem in the build log — would leave the site stale with no in-app signal
 * and no obvious way back for someone who does not use git.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { section: string } };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  if (!isSectionKey(params.section)) return notFound();

  if (!canCommitContent()) {
    console.error(
      `[content] not configured. Missing: ${missingContentEditorVars().join(", ")}`,
    );
    return errorResponse(503, "Content editing isn't configured.");
  }

  try {
    const file = await readContentFile(SECTIONS[params.section].file);
    return okResponse({ data: file.data, sha: file.sha });
  } catch (error) {
    console.error(
      "[content] read failed:",
      error instanceof Error ? error.message : error,
    );
    return errorResponse(502, "Couldn't read that file from GitHub.");
  }
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return notFound();

  if (!isSectionKey(params.section)) return notFound();

  if (!canCommitContent()) {
    console.error(
      `[content] not configured. Missing: ${missingContentEditorVars().join(", ")}`,
    );
    return errorResponse(503, "Content editing isn't configured.");
  }

  // Generous, because projects.json carries every case study.
  const checked = await checkRequest(request, { maxBytes: 512 * 1024 });
  if (checked.response) return checked.response;

  const body = checked.body as { data?: unknown; sha?: unknown } | null;
  if (!body || typeof body.sha !== "string") {
    return errorResponse(400, "Invalid request.");
  }

  // Before anything reaches GitHub.
  const validated = validateSection(params.section, body.data);
  if (!validated.ok) {
    return errorResponse(400, validated.message, { issues: validated.issues });
  }

  const section = SECTIONS[params.section];

  try {
    const commit = await commitContentFile({
      file: section.file,
      data: validated.data,
      sha: body.sha,
      message: `Update ${section.label.toLowerCase()} content`,
      author: {
        name: auth.user.name,
        // The account that saved it, so the history is honest about authorship.
        email: auth.user.email,
      },
    });

    return okResponse({ commit: commit.sha, url: commit.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[content] commit failed:", message);

    // The stale-SHA case is worth passing on verbatim: it is actionable, and it
    // is the one failure a person can fix themselves.
    if (message.includes("changed since")) {
      return errorResponse(409, message);
    }

    return errorResponse(502, "Couldn't save that to GitHub.");
  }
}
