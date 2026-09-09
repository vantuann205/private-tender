"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { validateTender, WINNER_RULES, type TenderInput, type Tender } from "./domain";
import { createTender, mutateTender } from "./storage";
import { useTenders } from "./use-tenders";
export function CreateTenderForm({ tender, onSaved, onCancel }: { tender?: Tender; onSaved?: () => void; onCancel?: () => void } = {}) {
  const router = useRouter();
  const { tenders, error: storageError } = useTenders();
  const [errors, setErrors] = useState<
    Partial<Record<keyof TenderInput, string>>
  >({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: TenderInput = {
      title: String(data.get("title") || ""),
      description: String(data.get("description") || ""),
      requirements: String(data.get("requirements") || ""),
      deadline: String(data.get("deadline") || ""),
      winnerRule: String(data.get("winnerRule") || ""),
      status: tender || data.get("status") === "Draft" ? "Draft" : "Open",
    };
    const invalid = validateTender(input);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setSaving(true);
    setError("");
    try {
      if (tender) {
        await mutateTender({ id: tender.id, action: "edit", input });
        onSaved?.();
      } else router.push(`/tenders/${(await createTender(input)).id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The tender could not be saved. Your form entries are still here. Reload and try again.",
      );
      setSaving(false);
    }
  }
  return (
    <>
      <Link href="/" className="back-link">
        Back to tender board
      </Link>
      <div className="page-heading">
        <div>
          <h1>{tender ? "Edit draft" : "Create a tender"}</h1>
          <p>Set clear expectations before the first bid arrives.</p>
        </div>
      </div>
      <div className="detail-grid">
        <form className="panel form-panel" onSubmit={submit} noValidate>
          <h2>Tender details</h2>
          <p className="small-copy">
            All fields are required. These details are public in the future
            protocol.
          </p>
          <div className="form-grid">
            {(
              [
                [
                  "title",
                  "Tender title",
                  "e.g. Workspace equipment & installation",
                ],
                [
                  "description",
                  "Scope of work",
                  "Describe the project, deliverables, and expectations.",
                ],
                [
                  "requirements",
                  "Eligibility requirements",
                  "One requirement per line",
                ],
              ] as const
            ).map(([name, label, placeholder]) => (
              <div className="field full" key={name}>
                <label htmlFor={name}>{label}</label>
                {name === "title" ? (
                  <input
                    id={name}
                    name={name}
                    defaultValue={tender?.title}
                    placeholder={placeholder}
                    maxLength={120}
                    required
                    aria-invalid={!!errors[name]}
                    aria-describedby={`${name}-error`}
                  />
                ) : (
                  <textarea
                    id={name}
                    name={name}
                    defaultValue={name === "requirements" ? tender?.requirements.join("\n") : tender?.description}
                    placeholder={placeholder}
                    rows={name === "description" ? 4 : 3}
                    maxLength={3000}
                    required
                    aria-invalid={!!errors[name]}
                    aria-describedby={`${name}-error`}
                  />
                )}
                <span id={`${name}-error`} className="error">
                  {errors[name]}
                </span>
              </div>
            ))}
            <div className="field">
              <label htmlFor="deadline">Bidding deadline</label>
              <input
                type="datetime-local"
                id="deadline"
                name="deadline"
                defaultValue={tender ? new Date(Date.parse(tender.deadline) - new Date(tender.deadline).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined}
                required
                aria-invalid={!!errors.deadline}
                aria-describedby="deadline-error"
              />
              <small>Entered in your browser’s local time zone.</small>
              <span id="deadline-error" className="error">
                {errors.deadline}
              </span>
            </div>
            {!tender && <div className="field">
              <label htmlFor="status">Initial status</label>
              <select id="status" name="status">
                <option>Open</option>
                <option>Draft</option>
              </select>
              <small>Draft tenders do not accept bids.</small>
            </div>}
            <div className="field full">
              <label htmlFor="winnerRule">Winner-selection rule</label>
              <select id="winnerRule" name="winnerRule" defaultValue={tender?.winnerRule}>
                {WINNER_RULES.map((rule) => (
                  <option key={rule}>{rule}</option>
                ))}
              </select>
              <small>
                Recorded only. Automatic evaluation is not implemented.
              </small>
            </div>
          </div>
          {(error || storageError) && (
            <p role="alert" className="error-banner">
              {error || storageError}
            </p>
          )}
          <div className="form-actions">
            {onCancel ? <button type="button" className="button secondary" onClick={onCancel} disabled={saving}>Cancel</button> : <Link className="button secondary" href="/">
              Cancel
            </Link>}
            <button
              className="button"
              disabled={saving || !tenders || !!storageError}
            >
              {saving ? "Saving…" : tender ? "Save draft" : "Create tender"}
            </button>
          </div>
        </form>
        <aside>
          <div className="notice">
            <Icon name="lock" />
            <div>
              <strong>Keep private information out.</strong>
              <p>
                Tender requirements and descriptions are public data. Do not
                include vendor credentials, bid amounts, or personal
                information.
              </p>
            </div>
          </div>
          <div className="participation-panel">
            <h3>Before you publish</h3>
            <p>
              Make the scope specific, keep eligibility requirements measurable,
              and give vendors enough time to respond.
            </p>
            <p>
              This demo saves public tender details in PostgreSQL, scoped to
              this browser’s workspace cookie. It does not publish to Midnight
              or invite vendors.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
