import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import {
  Contract, TenderStatus, ledger, pureCircuits, type Ledger,
} from "../../../.compact-generated/private-tender/contract/index.js";
import { witnesses, type PrivateState } from "./private-state";
import type { Providers } from "./providers";

const privateStateId = "privateTender";
export const compiledTender = CompiledContract.make("PrivateTender", Contract<PrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(".compact-generated/private-tender"),
);

export function hex32(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("Expected a 32-byte hexadecimal value.");
  return Uint8Array.from(value.match(/../g)!, (byte) => Number.parseInt(byte, 16));
}

export function vendorCommitment(address: string, digest: string, secret: string): Uint8Array {
  return pureCircuits.vendorIdentity(encodeContractAddress(address), hex32(digest), hex32(secret));
}

export function publicTender(state: Ledger) {
  return {
    status: TenderStatus[state.status],
    deadline: state.deadline.toString(),
    submissionCount: state.submissionCount.toString(),
    enrolledVendorCount: state.enrolledVendors.size().toString(),
    bidCommitmentCount: state.bidCommitments.size().toString(),
    requirementsDigest: Array.from(state.requirementsDigest, (byte) => byte.toString(16).padStart(2, "0")).join(""),
  };
}

type Tx = { public: { txId: string } };
type Calls = {
  openTender(): Promise<Tx>;
  enrollVendor(commitment: Uint8Array): Promise<Tx>;
  submitPrivateBid(): Promise<Tx>;
  closeTender(): Promise<Tx>;
};
export type TenderAction = "open" | "enroll" | "bid" | "close";

export async function runTenderCircuit(calls: Calls, action: TenderAction, commitment?: Uint8Array): Promise<string> {
  if (action === "open") return (await calls.openTender()).public.txId;
  if (action === "bid") return (await calls.submitPrivateBid()).public.txId;
  if (action === "close") return (await calls.closeTender()).public.txId;
  if (!commitment || commitment.length !== 32) throw new Error("Missing 32-byte vendor commitment.");
  return (await calls.enrollVendor(commitment)).public.txId;
}

export async function readTender(providers: Providers, address: string) {
  hex32(address);
  const state = await providers.publicDataProvider.queryContractState(address);
  if (!state) throw new Error("Contract was not found on Preprod.");
  return publicTender(ledger(state.data));
}

export async function callTender(
  providers: Providers, address: string, privateState: PrivateState,
  action: TenderAction, commitment?: Uint8Array,
): Promise<string> {
  hex32(address);
  const contract = await findDeployedContract(providers, {
    compiledContract: compiledTender,
    contractAddress: address,
    privateStateId,
    initialPrivateState: privateState,
  });
  try {
    await providers.privateStateProvider.set(privateStateId, privateState);
    return await runTenderCircuit(contract.callTx, action, commitment);
  } finally {
    await providers.privateStateProvider.remove(privateStateId);
  }
}

export async function deployTender(
  providers: Providers, ownerSecret: Uint8Array, deadlineSeconds: bigint, requirementsDigest: Uint8Array,
) {
  if (ownerSecret.length !== 32 || requirementsDigest.length !== 32 || deadlineSeconds <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error("A 32-byte owner secret, 32-byte digest and future deadline are required.");
  }
  const deployed = await deployContract(providers, {
    compiledContract: compiledTender,
    privateStateId,
    initialPrivateState: { ownerSecret },
    args: [deadlineSeconds, requirementsDigest],
  });
  return {
    address: deployed.deployTxData.public.contractAddress,
    txId: deployed.deployTxData.public.txId,
  };
}
