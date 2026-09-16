type WalletStatus = { status: string; networkId?: string };
type WalletConnection = { getConnectionStatus(): Promise<WalletStatus> };
type WalletRegistry<T extends WalletConnection> = Record<string, { apiVersion: string; connect(network: string): Promise<T> }>;

export async function connectPreprodWallet<T extends WalletConnection>(wallets: WalletRegistry<T> | undefined): Promise<T> {
  const preferred = wallets?.mnLace;
  const wallet = preferred?.apiVersion.startsWith("4.")
    ? preferred
    : Object.values(wallets ?? {}).find((candidate) => candidate.apiVersion.startsWith("4."));
  if (!wallet) throw new Error("WALLET_MISSING");

  const api = await wallet.connect("preprod");
  const status = await api.getConnectionStatus();
  if (status.status === "disconnected") throw new Error("DISCONNECTED");
  if (status.networkId !== "preprod") throw new Error("WRONG_NETWORK");
  return api;
}
