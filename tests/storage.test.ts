import test from "node:test";
import assert from "node:assert/strict";
import { decodeTenders, subscribeTenders, getTenders, createTender } from "../src/features/tenders/storage";
import { seedTenders } from "../src/features/tenders/seed";
test("stored public records reject malformed state and strip private extra fields", () => {
  const result = decodeTenders(JSON.stringify([{ ...seedTenders()[0], amount: "55000", vendorIdentity: "secret" }]));
  assert.equal("amount" in result[0], false);
  assert.equal("vendorIdentity" in result[0], false);
  for (const raw of ["broken", "{}", '[{"id":3}]', JSON.stringify([{ ...seedTenders()[0], deadline: "invalid" }])]) assert.throws(() => decodeTenders(raw));
});
test("creating a tender persists public data and failed writes leave the existing state unchanged", () => {
  let raw: string | null = null;
  let fail = false;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => raw, setItem: (_key: string, value: string) => { if (fail) throw new Error("Storage full"); raw = value; } } });
  const unsubscribe = subscribeTenders(() => {});
  const input = { title: "  New procurement  ", description: "A well-defined local tender.", requirements: "First requirement\n\nSecond requirement", deadline: new Date(Date.now() + 86400000).toISOString(), winnerRule: "Lowest eligible bid", status: "Open" as const };
  const tender = createTender(input);
  assert.equal(tender.title, "New procurement");
  assert.deepEqual(tender.requirements, ["First requirement", "Second requirement"]);
  assert.equal(decodeTenders(raw!)[0].id, tender.id);
  const count = getTenders()!.length;
  fail = true;
  assert.throws(() => createTender(input));
  assert.equal(getTenders()!.length, count);
  assert.throws(() => createTender({ ...input, title: "" }));
  unsubscribe();
});
