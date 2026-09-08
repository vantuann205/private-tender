"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { validateTender, WINNER_RULES, type TenderInput } from "./domain";
import { createTender } from "./storage";
import { useTenders } from "./use-tenders";
export function CreateTenderForm() {
  const router = useRouter();
  const { tenders, error: storageError } = useTenders();
  const [errors, setErrors] = useState<Partial<Record<keyof TenderInput, string>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: TenderInput = { title: String(data.get("title") || ""), description: String(data.get("description") || ""), requirements: String(data.get("requirements") || ""), deadline: String(data.get("deadline") || ""), winnerRule: String(data.get("winnerRule") || ""), status: data.get("status") === "Draft" ? "Draft" : "Open" };
    const invalid = validateTender(input);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setSaving(true); setError("");
    try { router.push(`/tenders/${createTender(input).id}`); }
    catch { setError("The tender could not be saved. Check browser storage permissions and try again. Your form entries are still here."); setSaving(false); }
  }
  return <><Link href="/" className="back-link">Back to tender board</Link><div className="page-heading"><div><h1>Create a tender</h1><p>Set clear expectations before the first bid arrives.</p></div></div><div className="detail-grid"><form className="panel form-panel" onSubmit={submit} noValidate><h2>Tender details</h2><p className="small-copy">All fields are required. These details are public in the future protocol.</p><div className="form-grid">{([ ["title", "Tender title", "e.g. Workspace equipment & installation"], ["description", "Scope of work", "Describe the project, deliverables, and expectations."], ["requirements", "Eligibility requirements", "One requirement per line"] ] as const).map(([name,label,placeholder]) => <div className="field full" key={name}><label htmlFor={name}>{label}</label>{name === "title" ? <input id={name} name={name} placeholder={placeholder} maxLength={120} required aria-invalid={!!errors[name]} aria-describedby={`${name}-error`} /> : <textarea id={name} name={name} placeholder={placeholder} rows={name === "description" ? 4 : 3} maxLength={3000} required aria-invalid={!!errors[name]} aria-describedby={`${name}-error`} />}<span id={`${name}-error`} className="error">{errors[name]}</span></div>)}<div className="field"><label htmlFor="deadline">Bidding deadline</label><input type="datetime-local" id="deadline" name="deadline" required aria-invalid={!!errors.deadline} aria-describedby="deadline-error" /><small>Entered in your browser’s local time zone.</small><span id="deadline-error" className="error">{errors.deadline}</span></div><div className="field"><label htmlFor="status">Initial status</label><select id="status" name="status"><option>Open</option><option>Draft</option></select><small>Draft tenders do not accept bids.</small></div><div className="field full"><label htmlFor="winnerRule">Winner-selection rule</label><select id="winnerRule" name="winnerRule">{WINNER_RULES.map(rule => <option key={rule}>{rule}</option>)}</select><small>Recorded only. Automatic evaluation is not implemented.</small></div></div>{(error || storageError) && <p role="alert" className="error-banner">{error || storageError}</p>}<div className="form-actions"><Link className="button secondary" href="/">Cancel</Link><button className="button" disabled={saving || !tenders || !!storageError}>{saving ? "Saving…" : "Create tender"}</button></div></form><aside><div className="notice"><Icon name="lock" /><div><strong>Keep private information out.</strong><p>Tender requirements and descriptions are public data. Do not include vendor credentials, bid amounts, or personal information.</p></div></div><div className="participation-panel"><h3>Before you publish</h3><p>Make the scope specific, keep eligibility requirements measurable, and give vendors enough time to respond.</p><p>This demo saves the tender in this browser only. It does not publish to Midnight or invite vendors.</p></div></aside></div></>;
}
