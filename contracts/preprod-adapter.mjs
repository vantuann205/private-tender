import { fileURLToPath } from "node:url";
import {
  Contract,
  TenderStatus,
  ledger,
  pureCircuits,
} from "../.compact-generated/private-tender/contract/index.js";

const required = (privateState, key) => {
  const value = privateState[key];
  if (value === undefined) throw new Error(`Missing PrivateTender witness: ${key}`);
  return [privateState, value];
};

export const contractName = "PrivateTender";
export const privateStateId = "privateTender";
export const artifactDirectory = fileURLToPath(new URL("../.compact-generated/private-tender/", import.meta.url));
export const witnesses = {
  ownerSecret: ({ privateState }) => required(privateState, "ownerSecret"),
  vendorSecret: ({ privateState }) => required(privateState, "vendorSecret"),
  privateBidAmount: ({ privateState }) => required(privateState, "bidAmount"),
  privateBidSalt: ({ privateState }) => required(privateState, "bidSalt"),
};

export function publicSnapshot(data) {
  const state = ledger(data);
  return {
    status: TenderStatus[state.status],
    submissionCount: Number(state.submissionCount),
    requirementsDigest: Buffer.from(state.requirementsDigest).toString("hex"),
    enrolledVendorCount: Number(state.enrolledVendors.size()),
    bidCommitmentCount: Number(state.bidCommitments.size()),
  };
}

export { Contract, ledger, pureCircuits };
