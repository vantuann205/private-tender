import test from "node:test";
import assert from "node:assert/strict";
import { memoryPrivateState, witnesses } from "../src/lib/midnight/private-state";

test("private bid witnesses fail closed and state is scoped to a contract", async () => {
  assert.throws(() => witnesses.ownerSecret({ privateState: {} } as never), /ownerSecret/);
  assert.throws(() => witnesses.privateBidAmount({ privateState: {} } as never), /bidAmount/);
  const store = memoryPrivateState();
  store.setContractAddress("a".repeat(64));
  await store.set("tender", { ownerSecret: new Uint8Array(32) });
  assert.equal((await store.get("tender"))?.ownerSecret?.length, 32);
  store.setContractAddress("b".repeat(64));
  assert.equal(await store.get("tender"), null);
  await store.clear();
  store.setContractAddress("a".repeat(64));
  assert.equal(await store.get("tender"), null);
});
