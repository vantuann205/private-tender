import { tenderStatus, type Tender } from "../tenders/domain";
export type EligibilityResult = { tenderId: string; eligible: boolean; mode: "development"; checkedAt: string };
// Development adapter boundary. This self-attestation is NOT a cryptographic proof.
export function proveEligibility(tender: Tender, satisfiesRequirements: boolean, now = Date.now()): EligibilityResult {
  if (tenderStatus(tender, now) !== "Open") throw new Error("This tender is not open for participation.");
  return { tenderId: tender.id, eligible: satisfiesRequirements, mode: "development", checkedAt: new Date(now).toISOString() };
}
