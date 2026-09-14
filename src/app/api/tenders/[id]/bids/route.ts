import { NextRequest, NextResponse } from "next/server";
import {
  WORKSPACE_COOKIE,
  RequestError,
  assertSameOrigin,
  readBidCommitment,
  workspaceIdentity,
} from "@/lib/api-security";
import { insertWorkspaceBidCommitment } from "@/features/tenders/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const identity = workspaceIdentity(
      request.cookies.get(WORKSPACE_COOKIE)?.value,
    );
    if (identity.fresh)
      throw new RequestError("Load the tender board before bidding.", 401);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(id))
      throw new RequestError("Invalid tender identifier.");
    const { commitment } = await readBidCommitment(request);
    return NextResponse.json(
      { receipt: await insertWorkspaceBidCommitment(identity.hash, id, commitment) },
      { status: 201, headers },
    );
  } catch (error) {
    if (error instanceof RequestError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers },
      );
    return NextResponse.json(
      { error: "Bid commitment could not be recorded." },
      { status: 503, headers },
    );
  }
}
