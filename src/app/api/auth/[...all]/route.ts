import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { hasAuth, missingAuthVars } from "@/lib/auth/config";
import { getAuth } from "@/lib/auth/server";

/**
 * Better Auth's endpoints: sign-in, callback, session, sign-out.
 *
 * `nodejs` runtime and `force-dynamic` match the project's other API routes, and
 * both are required here rather than stylistic — the WebSocket pool needs Node,
 * and a cached auth response would be a serious bug.
 *
 * The unconfigured case returns 503 with a vague message and logs the specific
 * missing variable names server-side, copying the treatment the chat route gives
 * the Gemini key. A vague response is not evasiveness: which environment
 * variables a deployment is missing is not a visitor's business, and the person
 * who needs to know has the logs. The blog stays fully readable either way,
 * because reading never requires a session.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unavailable(): NextResponse {
  console.error(
    `[auth] request rejected; not configured. Missing: ${missingAuthVars().join(", ")}`,
  );
  return NextResponse.json(
    { success: false, error: "Sign-in isn't available right now." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request): Promise<Response> {
  if (!hasAuth()) return unavailable();
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  if (!hasAuth()) return unavailable();
  return toNextJsHandler(getAuth()).POST(request);
}
