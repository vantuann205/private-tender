import test from "node:test";
import assert from "node:assert/strict";
import { connectPreprodWallet, deriveWalletSecret } from "../src/lib/midnight/extension-wallet";

test("connects a v4 Lace extension only after it confirms Preprod", async () => {
  let requested = "";
  const api = { getConnectionStatus: async () => ({ status: "connected", networkId: "preprod" }) };
  const connected = await connectPreprodWallet({ mnLace: {
    apiVersion: "4.0.1",
    connect: async (network: string) => { requested = network; return api; },
  } });
  assert.equal(connected, api);
  assert.equal(requested, "preprod");
});

test("rejects missing, incompatible, disconnected and wrong-network extensions", async () => {
  await assert.rejects(connectPreprodWallet({}), /WALLET_MISSING/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "3.0.0", connect: async () => ({ getConnectionStatus: async () => ({ status: "connected", networkId: "preprod" }) }) } }), /WALLET_MISSING/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "4.0.1", connect: async () => ({ getConnectionStatus: async () => ({ status: "connected", networkId: "preview" }) }) } }), /WRONG_NETWORK/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "4.0.1", connect: async () => ({ getConnectionStatus: async () => ({ status: "disconnected" }) }) } }), /DISCONNECTED/);
});

test("derives a stable private state from a Lace signature", async () => {
  let request = "";
  const api = {
    signData: async (data: string) => {
      request = data;
      return { data, signature: "signed-private-tender", verifyingKey: "wallet-key" };
    },
  };
  const first = await deriveWalletSecret(api, "private-tender:owner:v1");
  const second = await deriveWalletSecret(api, "private-tender:owner:v1");
  assert.equal(request, "private-tender:owner:v1");
  assert.equal(first.length, 32);
  assert.deepEqual(first, second);
});
