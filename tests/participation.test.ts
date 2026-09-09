import test from "node:test";
import { submitCurrentDemoBid } from "../src/features/bidding/submit-bid";
import assert from "node:assert/strict";
test("bid simulation rechecks persisted state without transmitting its amount", async () => {
  const originalFetch = globalThis.fetch;
  let status = "Closed";
  const tender = { id: "stale-tender", title: "Tender", description: "Scope", requirements: ["Registered"], deadline: new Date(Date.now() + 86400000).toISOString(), winnerRule: "Lowest eligible bid", status: "Open" as const, organization: "Demo", category: "General", createdAt: new Date().toISOString() };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/tenders");
    assert.equal(options?.body, undefined);
    return status === "unavailable" ? Response.json({}, { status: 503 }) : Response.json({ tenders: [{ ...tender, status }] });
  };
  try {
    const proof = proveEligibility(tender, true);
    await assert.rejects(submitCurrentDemoBid(tender.id, proof, "123.45"));
    status = "Open";
    const receipt = await submitCurrentDemoBid(tender.id, proof, "123.45");
    assert.equal("amount" in receipt, false);
    status = "unavailable";
    await assert.rejects(submitCurrentDemoBid(tender.id, proof, "123.45"));
  } finally { globalThis.fetch = originalFetch; }
});
import { seedTenders } from "../src/features/tenders/seed";
import { proveEligibility } from "../src/features/vendors/eligibility";
import { submitDemoBid } from "../src/features/bidding/submit-bid";
const now = Date.parse("2026-09-08T00:00:00Z");
const tender = seedTenders(now)[0];
test("demo eligibility returns a tender-bound decision for both eligible and ineligible vendors", () => {
  assert.equal(proveEligibility(tender, true, now).eligible, true);
  assert.equal(proveEligibility(tender, false, now).eligible, false);
  assert.equal(proveEligibility(tender, true, now).tenderId, tender.id);
});
test("eligibility cannot be checked for draft or expired tenders", () => {
  assert.throws(() =>
    proveEligibility({ ...tender, status: "Draft" }, true, now),
  );
  assert.throws(() =>
    proveEligibility(tender, true, Date.parse(tender.deadline)),
  );
});
test("a demo participation flow returns a receipt without retaining the amount", () => {
  const receipt = submitDemoBid(
    tender,
    proveEligibility(tender, true, now),
    "1200.50",
    now,
  );
  assert.equal(receipt.tenderId, tender.id);
  assert.equal("amount" in receipt, false);
  assert.equal(JSON.stringify(receipt).includes("1200.50"), false);
});
test("submission rejects missing, ineligible, and wrong-tender eligibility results", () => {
  assert.throws(() => submitDemoBid(tender, null, "100", now));
  assert.throws(() =>
    submitDemoBid(tender, proveEligibility(tender, false, now), "100", now),
  );
  assert.throws(() =>
    submitDemoBid(
      tender,
      { ...proveEligibility(tender, true, now), tenderId: "other" },
      "100",
      now,
    ),
  );
});
test("submission rechecks deadline and rejects invalid money inputs", () => {
  const proof = proveEligibility(tender, true, now);
  assert.throws(() =>
    submitDemoBid(tender, proof, "100", Date.parse(tender.deadline)),
  );
  for (const amount of [
    "",
    "0",
    "-1",
    "1.001",
    "NaN",
    "Infinity",
    "1e3",
    "1000000000000",
  ])
    assert.throws(() => submitDemoBid(tender, proof, amount, now));
});
