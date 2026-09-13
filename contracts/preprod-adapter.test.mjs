import assert from "node:assert/strict";
import test from "node:test";
import { createConstructorContext } from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  artifactDirectory,
  contractName,
  privateStateId,
  publicSnapshot,
  witnesses,
} from "./preprod-adapter.mjs";

test("PrivateTender adapter builds constructor state and exposes only public counts", () => {
  const privateState = {
    ownerSecret: new Uint8Array(32).fill(1),
    vendorSecret: new Uint8Array(32).fill(2),
    bidAmount: 7n,
    bidSalt: new Uint8Array(32).fill(3),
  };
  const initial = new Contract(witnesses).initialState(
    createConstructorContext(privateState, "0".repeat(64)),
    2_000_000_000n,
    new Uint8Array(32).fill(4),
  );
  assert.equal(contractName, "PrivateTender");
  assert.equal(privateStateId, "privateTender");
  assert.match(artifactDirectory.replaceAll("\\", "/"), /\.compact-generated\/private-tender\/$/);
  assert.deepEqual(publicSnapshot(initial.currentContractState.data), {
    status: "Draft",
    submissionCount: 0,
    requirementsDigest: "04".repeat(32),
    enrolledVendorCount: 0,
    bidCommitmentCount: 0,
  });
});

test("PrivateTender witnesses fail closed when a private value is absent", () => {
  assert.throws(() => witnesses.privateBidAmount({ privateState: {} }), /bidAmount/);
});
