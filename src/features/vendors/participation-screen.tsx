"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { tenderStatus } from "@/features/tenders/domain";
import { useTenders } from "@/features/tenders/use-tenders";
import { StatusBadge } from "@/features/tenders/tender-meta";
import { submitCurrentDemoBid, type PreparedBid } from "@/features/bidding/submit-bid";
import { refreshTenders } from "@/features/tenders/storage";
import { proveEligibility, type EligibilityResult } from "./eligibility";
export function ParticipationScreen({ id }: { id: string }) {
  const { tenders, error: databaseError } = useTenders();
  const [meets, setMeets] = useState(false);
  const [proof, setProof] = useState<EligibilityResult | null>(null);
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<PreparedBid | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (!tenders) return <p role="status">Loading vendor participation…</p>;
  const tender = tenders.find((t) => t.id === id);
  if (!tender)
    return (
      <div className="empty">
        <h1>{databaseError ? "Workspace unavailable" : "Tender not found"}</h1>
        {databaseError && <p role="alert">{databaseError}</p>}
        <Link className="button" href="/participate">
          View opportunities
        </Link>
      </div>
    );
  const open = tenderStatus(tender) === "Open";
  function verify() {
    setError("");
    try {
      setProof(proveEligibility(tender!, meets));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Eligibility could not be checked.",
      );
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      setReceipt(await submitCurrentDemoBid(id, proof, amount));
      setAmount("");
      void refreshTenders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bid simulation failed.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <Link className="back-link" href={`/tenders/${id}`}>
        Back to tender details
      </Link>
      <div className="page-heading">
        <div>
          <h1>Vendor participation</h1>
          <p>{tender.title}</p>
        </div>
        <StatusBadge tender={tender} />
      </div>
      <div className="notice participation-notice">
        <Icon name="shield" />
        <div>
          <strong>Development flow — not a Midnight proof or bid</strong>
          <p>
            Do not enter sensitive information. Eligibility uses
            self-attestation. Your amount and salt stay local; only their opaque
            commitment reaches this workspace database, not a blockchain.
          </p>
        </div>
      </div>
      {!open && (
        <div role="alert" className="error-banner">
          This tender is {tenderStatus(tender).toLowerCase()}. Participation is
          unavailable.
        </div>
      )}
      <div className="detail-grid">
        <section className="panel form-panel">
          <div className="step-heading">
            <span>1</span>
            <h2>Check your eligibility</h2>
          </div>
          <p className="small-copy">
            Confirm that you meet the tender’s requirements.
          </p>
          <ul className="requirement-list">
            {tender.requirements.map((r, i) => (
              <li key={i}>
                <Icon name="shield" size={17} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={meets}
              disabled={!!receipt || !open}
              onChange={(e) => {
                setMeets(e.target.checked);
                setProof(null);
              }}
            />
            <span>I meet all requirements (demo self-attestation)</span>
          </label>
          <button
            className="button secondary"
            type="button"
            disabled={!open || !!receipt}
            onClick={verify}
          >
            Prove Eligibility
          </button>
          <div
            role="status"
            className={`eligibility-result ${open && proof?.eligible ? "eligible" : ""}`}
          >
            <strong>
              {!open ? "Eligibility: Unavailable" : proof
                ? proof.eligible
                  ? "Eligibility: Verified (demo)"
                  : "Eligibility: Not eligible"
                : "Eligibility: Not checked"}
            </strong>
            <p>
              {!open ? "Participation is unavailable because this tender is not open." : proof
                ? proof.eligible
                  ? "You can continue to the local bid simulation."
                  : "Only vendors meeting every requirement can continue."
                : "No documents or identity details are requested."}
            </p>
          </div>
        </section>
        <section className="panel form-panel">
          <div className="step-heading">
            <span>2</span>
            <h2>Enter your private bid</h2>
          </div>
          {receipt ? (
            <div className="receipt" role="status">
              <Icon name="shield" size={35} />
              <h3>Bid commitment recorded</h3>
              <p>
                The server received an opaque SHA-256 commitment, never your
                amount or private salt. This is not yet a Midnight transaction.
              </p>
              <small>
                Server receipt
                <br />
                {receipt.publicReceipt.id}
                <br />
                Commitment: {receipt.commitment}
              </small>
              <p className="small-copy">
                Save this private salt with your fictional bid amount for a
                future reveal flow: <code>{receipt.privateSalt}</code>
              </p>
              <Link className="button secondary" href={`/tenders/${id}`}>
                Return to tender
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p className="small-copy">
                The tender board receives only an opaque commitment.
              </p>
              <div className="field">
                <label htmlFor="amount">Bid amount (USD)</label>
                <input
                  id="amount"
                  name="private-bid"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  maxLength={14}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting || !proof?.eligible || !open}
                  aria-describedby="amount-help"
                />
                <small id="amount-help">
                  Hashed in this browser. Use a fictional amount.
                </small>
              </div>
              <div className="bid-privacy">
                <Icon name="lock" size={17} />
                <span>
                  Amount: private input
                  <br />
                  <small>No public bid amounts or vendor identity</small>
                </span>
              </div>
              <button
                className="button"
                disabled={submitting || !proof?.eligible || !open || !amount}
              >
                {submitting ? "Committing bid…" : "Submit private commitment"}
              </button>
            </form>
          )}
        </section>
      </div>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
    </>
  );
}
