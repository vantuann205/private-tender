import { NextRequest, NextResponse } from "next/server";
import {
  WORKSPACE_COOKIE,
  workspaceIdentity,
  assertSameOrigin,
  readTenderBody,
  RequestError,
} from "@/lib/api-security";
import {
  listWorkspaceTenders,
  insertWorkspaceTender,
} from "@/features/tenders/repository";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
function failure(error: unknown) {
  if (error instanceof RequestError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers },
    );
  return NextResponse.json(
    { error: "Tender database is unavailable. Please try again later." },
    { status: 503, headers },
  );
}
export async function GET(request: NextRequest) {
  try {
    const identity = workspaceIdentity(
      request.cookies.get(WORKSPACE_COOKIE)?.value,
    );
    const response = NextResponse.json(
      { tenders: await listWorkspaceTenders(identity.hash) },
      { headers },
    );
    if (identity.fresh)
      response.cookies.set(WORKSPACE_COOKIE, identity.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    return response;
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const identity = workspaceIdentity(
      request.cookies.get(WORKSPACE_COOKIE)?.value,
    );
    if (identity.fresh)
      throw new RequestError(
        "Load the tender board to initialize your workspace.",
        401,
      );
    const input = await readTenderBody(request);
    return NextResponse.json(
      { tender: await insertWorkspaceTender(identity.hash, input) },
      { status: 201, headers },
    );
  } catch (error) {
    return failure(error);
  }
}
