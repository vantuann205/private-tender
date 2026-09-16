import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import type { ContractProviders } from "@midnight-ntwrk/midnight-js-contracts";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Transaction, CostModel } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { Contract, ProvableCircuits } from "../../../.compact-generated/private-tender/contract/index.js";
import { memoryPrivateState, type PrivateState } from "./private-state";

export type Providers = ContractProviders<Contract<PrivateState>>;

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error("Invalid transaction encoding.");
  return Uint8Array.from(value.match(/../g)!, (byte) => Number.parseInt(byte, 16));
}

export async function walletProviders(api: ConnectedAPI, origin: string): Promise<Providers> {
  const [configuration, addresses] = await Promise.all([api.getConfiguration(), api.getShieldedAddresses()]);
  if (configuration.networkId !== "preprod") throw new Error("WRONG_NETWORK");
  setNetworkId("preprod");
  const zkConfigProvider = new FetchZkConfigProvider<keyof ProvableCircuits<PrivateState>>(
    new URL("/zk", origin).href,
  );
  const proving = await api.getProvingProvider(zkConfigProvider);
  return {
    privateStateProvider: memoryPrivateState(),
    publicDataProvider: indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri),
    zkConfigProvider,
    proofProvider: { proveTx: (tx) => tx.prove(proving, CostModel.initialCostModel()) },
    walletProvider: {
      getCoinPublicKey: () => addresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey,
      async balanceTx(tx) {
        const response = await api.balanceUnsealedTransaction(hex(tx.serialize()));
        return Transaction.deserialize("signature", "proof", "binding", decodeHex(response.tx));
      },
    },
    midnightProvider: {
      async submitTx(tx) {
        await api.submitTransaction(hex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
}
