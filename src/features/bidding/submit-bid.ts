import { tenderStatus, type Tender } from "../tenders/domain";
import type { EligibilityResult } from "../vendors/eligibility";
export type BidReceipt = { id: string; tenderId: string; submittedAt: string; mode: "development" };
export function submitDemoBid(tender: Tender, proof: EligibilityResult | null, amount: string, now = Date.now()): BidReceipt {
  if (tenderStatus(tender, now) !== "Open") throw new Error("Bidding is not open for this tender.");
  if (!proof?.eligible || proof.tenderId !== tender.id || proof.mode !== "development") throw new Error("Check eligibility for this tender before bidding.");
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) throw new Error("Enter a positive amount below 100 billion USD, with at most two decimal places.");
  // Amount is validated then discarded: no storage, logging, network call, or public-state update.
  return { id: crypto.randomUUID(), tenderId: tender.id, submittedAt: new Date(now).toISOString(), mode: "development" };
}
