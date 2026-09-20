type WalletStatus = { status: string; networkId?: string };
type WalletConnection = { getConnectionStatus(): Promise<WalletStatus> };
type WalletRegistry<T extends WalletConnection> = Record<string, { apiVersion: string; connect(network: string): Promise<T> }>;
type WalletSigner = {
  signData(data: string, options: { encoding: "text"; keyType: "unshielded" }): Promise<{ signature: string; verifyingKey: string }>;
};

export async function deriveWalletSecret(api: WalletSigner, scope: string): Promise<Uint8Array> {
  if (!scope.trim()) throw new Error("A wallet signature scope is required.");
  const signed = await api.signData(scope, { encoding: "text", keyType: "unshielded" });
  return new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${scope}:${signed.verifyingKey}:${signed.signature}`),
  ));
}

export async function connectPreprodWallet<T extends WalletConnection>(wallets: WalletRegistry<T> | undefined): Promise<T> {
  const preferred = wallets?.mnLace;
  const wallet = preferred?.apiVersion.startsWith("4.")
    ? preferred
    : Object.values(wallets ?? {}).find((candidate) => candidate.apiVersion.startsWith("4."));
  if (!wallet) throw new Error("Lace 4.x was not found. Install or enable Lace, then refresh. (WALLET_MISSING)");

  const api = await wallet.connect("preprod");
  const status = await api.getConnectionStatus();
  if (status.status === "disconnected") throw new Error("Open Lace and approve this connection. (DISCONNECTED)");
  if (status.networkId !== "preprod") throw new Error("Switch Lace to Midnight Preprod, then reconnect. (WRONG_NETWORK)");
  return api;
}
