import test from "node:test";
import assert from "node:assert/strict";
import {
  validateTender,
  tenderStatus,
  type TenderInput,
} from "../src/features/tenders/domain";
const now = Date.parse("2026-09-08T00:00:00Z");
const input: TenderInput = {
  title: "Office equipment supply",
  description: "Supply and install equipment for the regional office.",
  requirements: "Registered business\nThree years of experience",
  deadline: "2026-10-01T00:00:00Z",
  winnerRule: "Lowest eligible bid",
  status: "Open",
};
test("a complete tender validates; required text and invalid rules are rejected", () => {
  assert.deepEqual(validateTender(input, now), {});
  assert.ok(validateTender({ ...input, title: " " }, now).title);
  assert.ok(validateTender({ ...input, requirements: " " }, now).requirements);
  assert.ok(
    validateTender({ ...input, winnerRule: "unknown" }, now).winnerRule,
  );
});
test("deadlines must be valid and future on creation", () => {
  for (const deadline of [
    "bad",
    "2026-09-08T00:00:00Z",
    "2026-01-01T00:00:00Z",
  ])
    assert.ok(validateTender({ ...input, deadline }, now).deadline);
});
test("open tenders close exactly at the deadline, while drafts remain drafts", () => {
  const tender = { status: "Open" as const, deadline: "2026-09-08T00:00:00Z" };
  assert.equal(tenderStatus(tender, now - 1), "Open");
  assert.equal(tenderStatus(tender, now), "Closed");
  assert.equal(tenderStatus({ ...tender, status: "Draft" }, now), "Draft");
  assert.equal(
    tenderStatus({ ...tender, status: "Closed" }, now - 1),
    "Closed",
  );
});
