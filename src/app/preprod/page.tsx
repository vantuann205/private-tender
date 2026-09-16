"use client";

import { useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import deployments from "../../../deployments/preprod.json";
import { connectPreprodWallet } from "@/lib/midnight/extension-wallet";
import type { Providers } from "@/lib/midnight/providers";
import type { TenderAction } from "@/lib/midnight/tender-contract";

type Snapshot = { status: string; deadline: string; submissionCount: string; enrolledVendorCount: string; bidCommitmentCount: string; requirementsDigest: string };

export default function PreprodPage() {
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [dust, setDust] = useState("");
  const [address, setAddress] = useState(deployments.contracts[0].contractAddress);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [owner, setOwner] = useState("");
  const [vendor, setVendor] = useState("");
  const [salt, setSalt] = useState("");
  const [amount, setAmount] = useState("");
  const [digest, setDigest] = useState("");
  const [deadline, setDeadline] = useState("");
  const [commitment, setCommitment] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true); setError("");
    try {
      const injected = Reflect.get(window, "midnight") as Record<string, InitialAPI> | undefined;
      const connected = await connectPreprodWallet(injected);
      const [{ walletProviders }, unshielded, dustBalance] = await Promise.all([
        import("@/lib/midnight/providers"), connected.getUnshieldedAddress(), connected.getDustBalance(),
      ]);
      setProviders(await walletProviders(connected, window.location.origin));
      setApi(connected);
      setWalletAddress(unshielded.unshieldedAddress);
      setDust(dustBalance.balance.toString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection failed.");
    } finally { setBusy(false); }
  }

  async function refresh(current = address) {
    if (!providers) throw new Error("Connect Lace first.");
    const { readTender } = await import("@/lib/midnight/tender-contract");
    setSnapshot(await readTender(providers, current));
  }

  async function read() {
    setBusy(true); setError("");
    try { await refresh(); } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cannot read contract.");
    } finally { setBusy(false); }
  }

  async function deriveCommitment() {
    setError("");
    try {
      if (!snapshot) throw new Error("Read the contract state first.");
      const { vendorCommitment } = await import("@/lib/midnight/tender-contract");
      setCommitment(Array.from(vendorCommitment(address, snapshot.requirementsDigest, vendor), (byte) => byte.toString(16).padStart(2, "0")).join(""));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not derive vendor commitment."); }
  }

  async function deploy() {
    if (!providers || !api || busy || !window.confirm("Deploy a NEW Preprod contract? Lace will ask you to approve a transaction. Save the owner secret privately before proceeding.")) return;
    setBusy(true); setError(""); setTxId("");
    try {
      const { deployTender, hex32 } = await import("@/lib/midnight/tender-contract");
      const result = await deployTender(providers, hex32(owner), BigInt(deadline), hex32(digest));
      setAddress(result.address); setTxId(result.txId); setOwner("");
      try { await refresh(result.address); } catch { setError("Transaction submitted; refresh the contract state separately before retrying."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Deployment failed. Check your wallet before retrying."); }
    finally { setBusy(false); }
  }

  async function transact(action: TenderAction) {
    if (!providers || !api || busy || !window.confirm(`Submit ${action} to Midnight Preprod? Lace will ask for approval.`)) return;
    setBusy(true); setError(""); setTxId("");
    try {
      const { callTender, hex32 } = await import("@/lib/midnight/tender-contract");
      if (action === "bid" && (!/^\d+$/.test(amount) || BigInt(amount) <= 0n)) throw new Error("Enter a positive integer bid amount.");
      const secret = action === "bid"
        ? { vendorSecret: hex32(vendor), bidSalt: hex32(salt), bidAmount: BigInt(amount) }
        : { ownerSecret: hex32(owner) };
      const id = await callTender(providers, address, secret, action, action === "enroll" ? hex32(commitment) : undefined);
      setTxId(id); setOwner(""); setVendor(""); setSalt(""); setAmount("");
      try { await refresh(); } catch { setError("Transaction submitted; refresh the contract state separately before retrying."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Transaction failed. Check the explorer before retrying."); }
    finally { setBusy(false); }
  }

  return <section className="panel preprod-console" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 18 }}>
    <div><h1>Midnight Preprod · contract console</h1><p>This is separate from the database tender board. Only Lace signs transactions; secrets stay in this browser session. An older sample contract may no longer accept actions after its deadline.</p></div>
    <div><button type="button" disabled={busy} onClick={() => { void connect(); }}>{api ? "Reconnect Lace" : "Connect Lace extension"}</button>{walletAddress && <p>Wallet: <code>{walletAddress}</code> · DUST: {dust}</p>}</div>
    <label>Contract address <input value={address} onChange={(event) => { setAddress(event.target.value.trim()); setSnapshot(null); }} maxLength={64} /></label>
    <button type="button" disabled={busy || !providers} onClick={() => { void read(); }}>Read confirmed public state</button>
    {snapshot && <dl><dt>Status</dt><dd>{snapshot.status}</dd><dt>Deadline (Unix seconds)</dt><dd>{snapshot.deadline}</dd><dt>Bids</dt><dd>{snapshot.submissionCount}</dd><dt>Enrolled vendors</dt><dd>{snapshot.enrolledVendorCount}</dd></dl>}
    <fieldset disabled={busy || !providers} style={{ display: "grid", gap: 12 }}><legend>Owner setup and actions</legend>
      <label>Owner secret (32-byte hex, never sent to our API) <input type="password" value={owner} onChange={(event) => setOwner(event.target.value.trim())} maxLength={64} autoComplete="off" /></label>
      <label>New contract deadline (Unix seconds) <input inputMode="numeric" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
      <label>Requirements digest (32-byte hex) <input value={digest} onChange={(event) => setDigest(event.target.value.trim())} maxLength={64} /></label>
      <button type="button" onClick={() => { void deploy(); }}>Deploy new tender contract</button>
      <label>Vendor commitment (32-byte hex) <input value={commitment} onChange={(event) => setCommitment(event.target.value.trim())} maxLength={64} /></label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}><button type="button" onClick={() => { void transact("enroll"); }}>Enroll vendor</button><button type="button" onClick={() => { void transact("open"); }}>Open tender</button><button type="button" onClick={() => { void transact("close"); }}>Close tender</button></div>
    </fieldset>
    <fieldset disabled={busy || !providers} style={{ display: "grid", gap: 12 }}><legend>Vendor bid</legend>
      <label>Vendor secret (32-byte hex) <input type="password" value={vendor} onChange={(event) => setVendor(event.target.value.trim())} maxLength={64} autoComplete="off" /></label>
      <button type="button" onClick={() => { void deriveCommitment(); }}>Derive vendor commitment for owner enrollment</button>
      <label>Private bid salt (32-byte hex) <input type="password" value={salt} onChange={(event) => setSalt(event.target.value.trim())} maxLength={64} autoComplete="off" /></label>
      <label>Private integer amount <input type="password" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} autoComplete="off" /></label>
      <button type="button" onClick={() => { void transact("bid"); }}>Submit private bid on Preprod</button>
    </fieldset>
    {busy && <p role="status">Waiting for Lace and Preprod confirmation…</p>}
    {txId && <p role="status">Confirmed transaction: <a href={`https://explorer.preprod.midnight.network/transactions/${txId}`} target="_blank" rel="noreferrer">{txId}</a></p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
