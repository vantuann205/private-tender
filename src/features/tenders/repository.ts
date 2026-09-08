import "server-only";
import { count, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/db/client";
import { tenders, workspaces } from "../../lib/db/schema";
import { RequestError } from "../../lib/api-security";
import { seedTenders } from "./seed";
import { type Tender, type TenderInput, validateTender } from "./domain";

function publicTender(row: typeof tenders.$inferSelect): Tender {
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
    return rows.map(publicTender);
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
