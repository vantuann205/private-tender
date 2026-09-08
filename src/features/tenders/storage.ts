import { type Tender, type TenderInput, validateTender } from "./domain";
let snapshot: Tender[] | null = null;
let storageError = "";
let request: Promise<void> | null = null;
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
    // Allow-list public fields: API responses cannot add an amount to the tender model.
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
  void refreshTenders();
  return () => {
    listeners.delete(listener);
  };
}
export function refreshTenders() {
  if (request) return request;
  request = (async () => {
    try {
      const response = await fetch("/api/tenders", {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error("Tender database is unavailable. Please try again.");
      const data = await response.json();
      snapshot = decodeTenders(JSON.stringify(data.tenders));
      storageError = "";
    } catch {
      snapshot = [];
      storageError =
        "Tender database is unavailable. Check your connection and try again. No browser-storage fallback is used.";
    } finally {
      request = null;
      listeners.forEach((notify) => notify());
    }
  })();
  return request;
}
export async function createTender(input: TenderInput): Promise<Tender> {
  if (Object.keys(validateTender(input)).length)
    throw new Error("Check the tender fields before saving.");
  if (request) await request;
  const response = await fetch("/api/tenders", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      deadline: new Date(input.deadline).toISOString(),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "The tender could not be saved. Check the fields, database connection, and workspace limit, then try again. Your entries are still here.",
    );
  const data = await response.json();
  const [tender] = decodeTenders(JSON.stringify([data.tender]));
  snapshot = [tender, ...(snapshot ?? [])];
  storageError = "";
  listeners.forEach((notify) => notify());
  return tender;
}
