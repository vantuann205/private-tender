import { type Tender, type TenderInput, validateTender } from "./domain";
import { seedTenders } from "./seed";
const KEY = "private-tender.public-tenders.v1";
let snapshot: Tender[] | null = null;
let storageError = "";
const listeners = new Set<() => void>();
export function decodeTenders(raw: string): Tender[] {
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values) || values.length > 500)
    throw new Error("Invalid tender storage.");
  return values.map((value: unknown) => {
    if (!value || typeof value !== "object")
      throw new Error("Invalid tender record.");
    const v = value as Record<string, unknown>;
    for (const key of [
      "id",
      "title",
      "description",
      "deadline",
      "winnerRule",
      "organization",
      "category",
      "createdAt",
    ])
      if (typeof v[key] !== "string") throw new Error("Invalid tender field.");
    if (
      !Array.isArray(v.requirements) ||
      !v.requirements.every((r) => typeof r === "string") ||
      !["Draft", "Open", "Closed"].includes(String(v.status)) ||
      !Number.isFinite(Date.parse(String(v.deadline)))
    )
      throw new Error("Invalid tender state.");
    // Allow-list public fields: imported storage can never add a bid amount to the public model.
    return {
      id: String(v.id),
      title: String(v.title),
      description: String(v.description),
      requirements: v.requirements,
      deadline: String(v.deadline),
      winnerRule: String(v.winnerRule),
      status: v.status as Tender["status"],
      organization: String(v.organization),
      category: String(v.category),
      createdAt: String(v.createdAt),
    };
  });
}
export function getTenders() {
  return snapshot;
}
export function getStorageError() {
  return storageError;
}
export function subscribeTenders(listener: () => void) {
  listeners.add(listener);
  if (snapshot === null) {
    try {
      const raw = localStorage.getItem(KEY);
      snapshot = raw === null ? seedTenders() : decodeTenders(raw);
      if (raw === null) localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
      snapshot = [];
      storageError =
        "Local data could not be read or saved. Existing storage was not overwritten. Check browser storage permissions or clear this site's demo data.";
    }
    listeners.forEach((notify) => notify());
  }
  return () => {
    listeners.delete(listener);
  };
}
export function createTender(input: TenderInput): Tender {
  if (Object.keys(validateTender(input)).length)
    throw new Error("Check the tender fields before saving.");
  if (storageError) throw new Error(storageError);
  if ((snapshot?.length ?? 0) >= 500)
    throw new Error("This local demo supports at most 500 tenders.");
  const tender: Tender = {
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
  };
  const next = [tender, ...(snapshot ?? [])];
  // ponytail: single-browser local demo; use a transactional server store for shared organizations.
  localStorage.setItem(KEY, JSON.stringify(next));
  snapshot = next;
  listeners.forEach((notify) => notify());
  return tender;
}
