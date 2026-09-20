"use client";

import { useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import deployments from "../../../deployments/preprod.json";
import { connectPreprodWallet, deriveWalletSecret } from "@/lib/midnight/extension-wallet";
import type { Providers } from "@/lib/midnight/providers";
import type { TenderAction } from "@/lib/midnight/tender-contract";

type Snapshot = {
  status: string;
  deadline: string;
  submissionCount: string;
  enrolledVendorCount: string;
  requirementsDigest: string;
};

const walletMethods = [
  "getUnshieldedAddress",
  "getShieldedAddresses",
  "getConfiguration",
  "getProvingProvider",
  "balanceUnsealedTransaction",
  "submitTransaction",
  "signData",
] as const;

function bytesHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim())));
}

export default function PreprodPage() {
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [dust, setDust] = useState("");
  const [address, setAddress] = useState(deployments.contracts[0].contractAddress);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [requirements, setRequirements] = useState("");
  const [deadline, setDeadline] = useState("");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const injected = Reflect.get(window, "midnight") as Record<string, InitialAPI> | undefined;
      const connected = await connectPreprodWallet(injected);
      await connected.hintUsage([...walletMethods]);
      const [{ walletProviders }, unshielded, dustBalance] = await Promise.all([
        import("@/lib/midnight/providers"),
        connected.getUnshieldedAddress(),
        connected.getDustBalance(),
      ]);
      const nextProviders = await walletProviders(connected, window.location.origin);
      setApi(connected);
      setProviders(nextProviders);
      setWalletAddress(unshielded.unshieldedAddress);
      setDust(dustBalance.balance.toString());
      const { readTender } = await import("@/lib/midnight/tender-contract");
      setSnapshot(await readTender(nextProviders, address));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lace connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(current = address) {
    if (!providers) throw new Error("Connect Lace first.");
    const { readTender } = await import("@/lib/midnight/tender-contract");
    setSnapshot(await readTender(providers, current));
  }

  async function deploy() {
    if (!providers || !api || busy) return;
    if (!requirements.trim() || !deadline) {
      setError("Add the tender requirements and deadline.");
      return;
    }
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const ownerSecret = await deriveWalletSecret(api, "private-tender:owner:v1");
      const deadlineSeconds = BigInt(Math.floor(new Date(deadline).getTime() / 1000));
      const { deployTender } = await import("@/lib/midnight/tender-contract");
      const result = await deployTender(providers, ownerSecret, deadlineSeconds, await digest(requirements));
      setAddress(result.address);
      setTxId(result.txId);
      await refresh(result.address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tender deployment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function transact(action: TenderAction) {
    if (!providers || !api || busy) return;
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const { callTender, readTender, vendorCommitment } = await import("@/lib/midnight/tender-contract");
      const current = snapshot ?? await readTender(providers, address);
      let privateState;
      let commitment: Uint8Array | undefined;

      if (action === "bid") {
        if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) throw new Error("Enter a positive bid amount.");
        privateState = {
          vendorSecret: await deriveWalletSecret(api, "private-tender:vendor:v1"),
          bidSalt: crypto.getRandomValues(new Uint8Array(32)),
          bidAmount: BigInt(amount),
        };
      } else {
        privateState = { ownerSecret: await deriveWalletSecret(api, "private-tender:owner:v1") };
        if (action === "enroll") {
          const vendorSecret = await deriveWalletSecret(api, "private-tender:vendor:v1");
          commitment = vendorCommitment(address, current.requirementsDigest, bytesHex(vendorSecret));
        }
      }

      const id = await callTender(providers, address, privateState, action, commitment);
      setTxId(id);
      setAmount("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Transaction failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 64px" }}>
    <header style={{ marginBottom: 24 }}>
      <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.65 }}>Midnight Preprod</p>
      <h1>PrivateTender wallet workspace</h1>
      <p>Connect Lace to create and operate private tenders. The page never requests a private key or owner secret.</p>
    </header>

    <section className="panel" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <strong>{walletAddress ? "Lace connected" : "Wallet required"}</strong>
        <p>{walletAddress ? walletAddress : "Use Lace 4.x on Midnight Preprod to continue."}</p>
        {dust ? <small>DUST balance: {dust}</small> : null}
      </div>
      <button type="button" disabled={busy} onClick={() => { void connect(); }}>
        {busy ? "Connecting…" : api ? "Reconnect Lace" : "Connect Lace"}
      </button>
    </section>

    {api ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 20 }}>
      <section className="panel">
        <h2>Active tender</h2>
        <label>Contract address<input value={address} maxLength={64} onChange={(event) => { setAddress(event.target.value.trim()); setSnapshot(null); }} /></label>
        <button type="button" disabled={busy} onClick={() => { void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Cannot read contract.")); }}>Refresh state</button>
        {snapshot ? <dl>
          <dt>Status</dt><dd>{snapshot.status}</dd>
          <dt>Deadline</dt><dd>{new Date(Number(snapshot.deadline) * 1000).toLocaleString()}</dd>
          <dt>Enrolled wallets</dt><dd>{snapshot.enrolledVendorCount}</dd>
          <dt>Private bids</dt><dd>{snapshot.submissionCount}</dd>
        </dl> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" disabled={busy} onClick={() => { void transact("enroll"); }}>Enroll this wallet</button>
          <button type="button" disabled={busy} onClick={() => { void transact("open"); }}>Open tender</button>
          <button type="button" disabled={busy} onClick={() => { void transact("close"); }}>Close tender</button>
        </div>
        <label>Bid amount<input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <button type="button" disabled={busy} onClick={() => { void transact("bid"); }}>Submit private bid</button>
      </section>

      <section className="panel">
        <h2>Create tender</h2>
        <label>Requirements<textarea value={requirements} onChange={(event) => setRequirements(event.target.value)} rows={5} /></label>
        <label>Bidding deadline<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
        <button type="button" disabled={busy} onClick={() => { void deploy(); }}>Create with Lace</button>
        <p><small>Lace signs the identity proof, pays the network fee, and submits the contract transaction.</small></p>
      </section>
    </div> : null}

    {busy ? <p role="status">Waiting for Lace and Preprod confirmation…</p> : null}
    {txId ? <p role="status">Confirmed: <a href={"https://explorer.preprod.midnight.network/transactions/" + txId} target="_blank" rel="noreferrer">{txId}</a></p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </main>;
}
