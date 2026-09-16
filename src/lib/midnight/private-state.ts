import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import type { SigningKey } from "@midnight-ntwrk/compact-runtime";
import type { Witnesses } from "../../../.compact-generated/private-tender/contract/index.js";

export type PrivateState = {
  ownerSecret?: Uint8Array;
  vendorSecret?: Uint8Array;
  bidAmount?: bigint;
  bidSalt?: Uint8Array;
};

export const witnesses: Witnesses<PrivateState> = {
  ownerSecret: ({ privateState }) => {
    if (!privateState.ownerSecret) throw new Error("Missing ownerSecret");
    return [privateState, privateState.ownerSecret];
  },
  vendorSecret: ({ privateState }) => {
    if (!privateState.vendorSecret) throw new Error("Missing vendorSecret");
    return [privateState, privateState.vendorSecret];
  },
  privateBidAmount: ({ privateState }) => {
    if (privateState.bidAmount === undefined) throw new Error("Missing bidAmount");
    return [privateState, privateState.bidAmount];
  },
  privateBidSalt: ({ privateState }) => {
    if (!privateState.bidSalt) throw new Error("Missing bidSalt");
    return [privateState, privateState.bidSalt];
  },
};

export function memoryPrivateState(): PrivateStateProvider<string, PrivateState> {
  let address = "";
  const states = new Map<string, PrivateState>();
  const keys = new Map<string, SigningKey>();
  const unsupported = async (): Promise<never> => {
    throw new Error("Private-state export is unavailable.");
  };
  return {
    setContractAddress(value) { address = value; },
    async set(id, value) { states.set(address + ":" + id, value); },
    async get(id) { return states.get(address + ":" + id) ?? null; },
    async remove(id) { states.delete(address + ":" + id); },
    async clear() { states.clear(); },
    async setSigningKey(id, value) { keys.set(id, value); },
    async getSigningKey(id) { return keys.get(id) ?? null; },
    async removeSigningKey(id) { keys.delete(id); },
    async clearSigningKeys() { keys.clear(); },
    exportPrivateStates: unsupported,
    importPrivateStates: unsupported,
    exportSigningKeys: unsupported,
    importSigningKeys: unsupported,
  };
}
