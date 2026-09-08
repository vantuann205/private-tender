export type TenderStatus = "Draft" | "Open" | "Closed";
export const WINNER_RULES = ["Lowest eligible bid", "Manual review (future)"] as const;
export type TenderInput = { title: string; description: string; requirements: string; deadline: string; winnerRule: string; status: TenderStatus };
export type Tender = Omit<TenderInput, "requirements"> & { id: string; requirements: string[]; organization: string; category: string; createdAt: string };
export function validateTender(input: TenderInput, now = Date.now()): Partial<Record<keyof TenderInput, string>> {
  const errors: Partial<Record<keyof TenderInput, string>> = {};
  for (const key of ["title", "description", "requirements"] as const) {
    const max = key === "title" ? 120 : 3000;
    if (!input[key].trim() || input[key].length > max) errors[key] = `Enter ${key} (1–${max} characters).`;
  }
  if (!Number.isFinite(Date.parse(input.deadline)) || Date.parse(input.deadline) <= now) errors.deadline = "Choose a future bidding deadline.";
  if (!WINNER_RULES.some(rule => rule === input.winnerRule)) errors.winnerRule = "Choose a supported winner rule.";
  if (!["Draft", "Open"].includes(input.status)) errors.status = "New tenders must be Draft or Open.";
  return errors;
}
export function tenderStatus(tender: Pick<Tender, "status" | "deadline">, now = Date.now()): TenderStatus {
  return tender.status === "Open" && Date.parse(tender.deadline) <= now ? "Closed" : tender.status;
}
