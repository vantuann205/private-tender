import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/db/client";
import { bidCommitments, tenders, workspaces } from "../../lib/db/schema";
import { RequestError } from "../../lib/api-security";
import { seedTenders } from "./seed";
import { type Tender, type TenderInput, type TenderMutation, validateTender } from "./domain";

function publicTender(row: typeof tenders.$inferSelect, bidCount = 0): Tender {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requirements: row.requirements,
    deadline: new Date(row.deadline).toISOString(),
    winnerRule: row.winnerRule,
    status: row.status as Tender["status"],
    organization: row.organization,
    category: row.category,
    createdAt: new Date(row.createdAt).toISOString(),
    bidCount,
  };
}
export async function listWorkspaceTenders(hash: string) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(workspaces)
      .values({ tokenHash: hash })
      .onConflictDoNothing()
      .returning();
    if (inserted.length)
      await tx
        .insert(tenders)
        .values(
          seedTenders().map((tender) => ({ ...tender, workspaceHash: hash })),
        );
    const rows = await tx
      .select()
      .from(tenders)
      .where(eq(tenders.workspaceHash, hash))
      .orderBy(desc(tenders.createdAt), tenders.id)
      .limit(500);
    const totals = await tx
      .select({ tenderId: bidCommitments.tenderId, value: count() })
      .from(bidCommitments)
      .where(eq(bidCommitments.workspaceHash, hash))
      .groupBy(bidCommitments.tenderId);
    const counts = new Map(totals.map((item) => [item.tenderId, item.value]));
    return rows.map((row) => publicTender(row, counts.get(row.id) ?? 0));
  });
}
export async function insertWorkspaceTender(hash: string, input: TenderInput) {
  if (Object.keys(validateTender(input)).length)
    throw new RequestError("Check the tender fields before saving.");
  return getDatabase().transaction(async (tx) => {
    // Lock this workspace only: concurrent creates cannot bypass the 500-tender cap.
    const workspace = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.tokenHash, hash))
      .for("update");
    if (!workspace.length)
      throw new RequestError(
        "Load the tender board to initialize your workspace.",
        401,
      );
    const [total] = await tx
      .select({ value: count() })
      .from(tenders)
      .where(eq(tenders.workspaceHash, hash));
    if (total.value >= 500)
      throw new RequestError(
        "This demo workspace supports at most 500 tenders.",
        409,
      );
    const [created] = await tx
      .insert(tenders)
      .values({
        workspaceHash: hash,
        id: crypto.randomUUID(),
        title: input.title.trim(),
        description: input.description.trim(),
        requirements: input.requirements
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        deadline: new Date(input.deadline).toISOString(),
        winnerRule: input.winnerRule,
        status: input.status,
        organization: "Northstar Collective",
        category: "General procurement",
        createdAt: new Date().toISOString(),
      })
      .returning();
    return publicTender(created);
  });
}
export async function mutateWorkspaceTender(hash: string, mutation: TenderMutation) {
  return getDatabase().transaction(async (tx) => {
    const owned = and(eq(tenders.workspaceHash, hash), eq(tenders.id, mutation.id));
    // Serialize lifecycle and content changes on the owned row, including across tabs.
    const [current] = await tx.select().from(tenders).where(owned).for("update");
    if (!current) throw new RequestError("Tender not found in this workspace.", 404);
    const expected = mutation.action === "close" ? "Open" : "Draft";
    if (current.status !== expected)
      throw new RequestError("Tender state changed. Reload before trying again. Opened tender details cannot be edited.", 409);
    let changes: Partial<typeof tenders.$inferInsert>;
    if (mutation.action === "edit") {
      const input = mutation.input;
      if (input.status !== "Draft" || Object.keys(validateTender(input)).length)
        throw new RequestError("Check the draft fields and future deadline before saving.");
      changes = {
        title: input.title.trim(),
        description: input.description.trim(),
        requirements: input.requirements.split("\n").map((r) => r.trim()).filter(Boolean),
        deadline: new Date(input.deadline).toISOString(),
        winnerRule: input.winnerRule,
      };
    } else {
      if (mutation.action === "publish" && Date.parse(current.deadline) <= Date.now())
        throw new RequestError("Set a future deadline before publishing this draft.");
      changes = { status: mutation.action === "publish" ? "Open" : "Closed" };
    }
    const [updated] = await tx.update(tenders).set(changes).where(owned).returning();
    const [total] = await tx
      .select({ value: count() })
      .from(bidCommitments)
      .where(
        and(
          eq(bidCommitments.workspaceHash, hash),
          eq(bidCommitments.tenderId, mutation.id),
        ),
      );
    return publicTender(updated, total.value);
  });
}

export async function insertWorkspaceBidCommitment(
  hash: string,
  tenderId: string,
  commitment: string,
) {
  return getDatabase().transaction(async (tx) => {
    const owned = and(
      eq(tenders.workspaceHash, hash),
      eq(tenders.id, tenderId),
    );
    const [tender] = await tx.select().from(tenders).where(owned).for("update");
    if (!tender)
      throw new RequestError("Tender not found in this workspace.", 404);
    if (tender.status !== "Open" || Date.parse(tender.deadline) <= Date.now())
      throw new RequestError("Bidding is no longer open for this tender.", 409);
    const [total] = await tx
      .select({ value: count() })
      .from(bidCommitments)
      .where(
        and(
          eq(bidCommitments.workspaceHash, hash),
          eq(bidCommitments.tenderId, tenderId),
        ),
      );
    if (total.value >= 500)
      throw new RequestError("This tender has reached its demo bid limit.", 409);
    const [created] = await tx
      .insert(bidCommitments)
      .values({
        workspaceHash: hash,
        tenderId,
        id: crypto.randomUUID(),
        commitment,
      })
      .onConflictDoNothing()
      .returning();
    if (!created)
      throw new RequestError("This bid commitment was already submitted.", 409);
    return {
      id: created.id,
      tenderId: created.tenderId,
      commitment: created.commitment,
      submittedAt: new Date(created.submittedAt).toISOString(),
    };
  });
}
