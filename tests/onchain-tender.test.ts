import test from "node:test";
import assert from "node:assert/strict";
import { createConstructorContext, encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits } from "../.compact-generated/private-tender/contract/index.js";
import { witnesses } from "../src/lib/midnight/private-state";
import { hex32, publicTender, runTenderCircuit, vendorCommitment } from "../src/lib/midnight/tender-contract";

test("projects only public ledger fields and rejects malformed contract bytes", () => {
  assert.throws(() => hex32("not-a-contract"), /32-byte/);
  const initial = new Contract(witnesses).initialState(
    createConstructorContext({ ownerSecret: new Uint8Array(32).fill(1) }, "0".repeat(64)),
    2_000_000_000n,
    new Uint8Array(32).fill(2),
  );
  assert.deepEqual(publicTender(ledger(initial.currentContractState.data)), {
    status: "Draft", deadline: "2000000000", submissionCount: "0",
    enrolledVendorCount: "0", bidCommitmentCount: "0", requirementsDigest: "02".repeat(32),
  });
});

test("derives the same vendor commitment as the Compact circuit", () => {
  const address = "01".repeat(32), requirements = "02".repeat(32), secret = "03".repeat(32);
  assert.deepEqual(vendorCommitment(address, requirements, secret), pureCircuits.vendorIdentity(
    encodeContractAddress(address), hex32(requirements), hex32(secret),
  ));
});

test("routes each explicit action to its matching Compact circuit", async () => {
  const calls: string[] = [];
  const callTx = {
    openTender: async () => { calls.push("open"); return { public: { txId: "open-id" } }; },
    enrollVendor: async (bytes: Uint8Array) => { calls.push(`enroll:${bytes.length}`); return { public: { txId: "enroll-id" } }; },
    submitPrivateBid: async () => { calls.push("bid"); return { public: { txId: "bid-id" } }; },
    closeTender: async () => { calls.push("close"); return { public: { txId: "close-id" } }; },
  };
  assert.equal(await runTenderCircuit(callTx, "open"), "open-id");
  assert.equal(await runTenderCircuit(callTx, "enroll", new Uint8Array(32)), "enroll-id");
  assert.equal(await runTenderCircuit(callTx, "bid"), "bid-id");
  assert.equal(await runTenderCircuit(callTx, "close"), "close-id");
  assert.deepEqual(calls, ["open", "enroll:32", "bid", "close"]);
});
