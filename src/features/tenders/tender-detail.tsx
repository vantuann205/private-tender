"use client";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { useTenders } from "./use-tenders";
import { StatusBadge, TenderDate } from "./tender-meta";
import { tenderStatus } from "./domain";
export function TenderDetail({ id }: { id: string }) {
  const { tenders, error } = useTenders();
  if (!tenders) return <p role="status">Loading tender…</p>;
  const tender = tenders.find(t => t.id === id);
  if (!tender) return <div className="empty"><h1>Tender not found</h1><p>{error || "This tender may belong to another browser's local workspace."}</p><Link href="/" className="button">Back to tender board</Link></div>;
  const status = tenderStatus(tender);
  return <><Link className="back-link" href="/">Back to tender board</Link><div className="page-heading"><div><h1>{tender.title}</h1><p>{tender.organization} · {tender.category}</p></div><StatusBadge tender={tender} /></div><div className="detail-grid"><div className="panel detail-content"><h2>Scope of work</h2><p className="preserve-lines">{tender.description}</p><section><h2>Eligibility requirements</h2><p>Vendors should satisfy every requirement before bidding.</p><ul className="requirement-list">{tender.requirements.map((requirement, i) => <li key={i}><Icon name="shield" size={18} /><span>{requirement}</span></li>)}</ul></section><section><h2>Winner-selection rule</h2><p>{tender.winnerRule}</p><p className="small-copy">Rule recorded for the future contract integration. No winner is evaluated or selected in this development pass.</p></section></div><aside className="detail-aside"><div className="panel participation-panel"><span className="icon-block"><Icon name="file" size={24} /></span><h2>Your next opportunity</h2><p>Review the requirements and check your eligibility before entering a bid.</p><dl><dt>Bidding closes</dt><dd><TenderDate value={tender.deadline} /><small>{new Date(tender.deadline).toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })} UTC</small></dd><dt>Participation</dt><dd>{status === "Open" ? "Open to eligible vendors" : status === "Draft" ? "Not yet open" : "Bidding closed"}</dd></dl>{status === "Open" ? <Link className="button" href={`/tenders/${id}/participate`}>Participate in tender<Icon name="arrow" size={16} /></Link> : <p className="notice">{status === "Draft" ? "This draft is not accepting bids." : "The deadline has passed. Bid entry is disabled."}</p>}</div><div className="notice"><Icon name="lock" /><div><strong>No public bid amounts</strong><p>The board contains only public tender details. Bid entry is a local simulation.</p></div></div></aside></div></>;
}
