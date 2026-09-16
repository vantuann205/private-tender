import test from "node:test";
import assert from "node:assert/strict";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { walletProviders } from "../src/lib/midnight/providers";

test("wallet providers refuse a connector configured for another network", async () => {
  const api = {
    getConfiguration: async () => ({ networkId: "preview", indexerUri: "https://example.test/graphql", indexerWsUri: "wss://example.test/graphql/ws" }),
    getShieldedAddresses: async () => ({ shieldedAddress: "address", shieldedCoinPublicKey: "coin", shieldedEncryptionPublicKey: "encryption" }),
  } as unknown as ConnectedAPI;
  await assert.rejects(walletProviders(api, "http://localhost:3000"), /WRONG_NETWORK/);
});
