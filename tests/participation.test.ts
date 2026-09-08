import test from "node:test";
import assert from "node:assert/strict";
import { seedTenders } from "../src/features/tenders/seed";
import { proveEligibility } from "../src/features/vendors/eligibility";
const now = Date.parse("2026-09-08T00:00:00Z");
const tender = seedTenders(now)[0];
test("demo eligibility returns a tender-bound decision for both eligible and ineligible vendors", () => {
  assert.equal(proveEligibility(tender, true, now).eligible, true);
  assert.equal(proveEligibility(tender, false, now).eligible, false);
  assert.equal(proveEligibility(tender, true, now).tenderId, tender.id);
});
test("eligibility cannot be checked for draft or expired tenders", () => {
  assert.throws(() => proveEligibility({ ...tender, status: "Draft" }, true, now));
  assert.throws(() => proveEligibility(tender, true, Date.parse(tender.deadline)));
});
