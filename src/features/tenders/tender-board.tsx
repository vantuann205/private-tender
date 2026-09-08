"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { tenderStatus } from "./domain";
import { useTenders } from "./use-tenders";
import { refreshTenders } from "./storage";
import { StatusBadge, TenderDate } from "./tender-meta";
export function TenderBoard({ vendor = false }: { vendor?: boolean }) {
  const { tenders, error } = useTenders();
  const [filter, setFilter] = useState("All tenders");
  const [search, setSearch] = useState("");
  if (!tenders)
    return (
      <div className="loading" role="status">
        Loading your procurement workspace…
      </div>
    );
  const visible = tenders.filter(
    (t) =>
      (filter === "All tenders" || tenderStatus(t) === filter) &&
      `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{vendor ? "Find your next opportunity." : "Tender board"}</h1>
          <p>
            {vendor
              ? "Review the requirements. Check your eligibility. Participate privately."
              : "Manage opportunities. Keep the competition fair."}
          </p>
        </div>
        <Link className="button" href="/tenders/new">
          <Icon name="plus" size={17} />
          Create tender
        </Link>
      </div>
      <div className="summary-strip">
        <div>
          <span>Total tenders</span>
          <strong>{tenders.length.toString().padStart(2, "0")}</strong>
          <small>In this workspace</small>
        </div>
        <div>
          <span>Open for bidding</span>
          <strong>
            {tenders
              .filter((t) => tenderStatus(t) === "Open")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <small>Accepting participation</small>
        </div>
        <div>
          <span>Drafts</span>
          <strong>
            {tenders
              .filter((t) => tenderStatus(t) === "Draft")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <small>Not accepting bids</small>
        </div>
        <div className="summary-privacy">
          <Icon name="lock" size={27} />
          <div>
            <strong>Bid amounts stay private.</strong>
            <p>
              No amounts on the tender board.
              <br />
              Local prototype, not a live auction.
            </p>
          </div>
        </div>
      </div>
      {error && (
        <div role="alert" className="error-banner">
          {error}{" "}
          <button
            className="button secondary"
            onClick={() => void refreshTenders()}
          >
            Retry connection
          </button>
        </div>
      )}
      <div className="board-tools">
        <div className="tabs" aria-label="Tender status filter">
          {["All tenders", "Open", "Draft", "Closed"].map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={filter === tab}
              className={filter === tab ? "selected" : ""}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="search-wrap">
          <Icon name="search" size={16} />
          <input
            aria-label="Search tenders"
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenders…"
          />
        </div>
      </div>
      <div className="tender-grid">
        {visible.map((tender) => (
          <article className="tender-card panel" key={tender.id}>
            <div className="card-top">
              <span className="category">{tender.category}</span>
              <StatusBadge tender={tender} />
            </div>
            <h2>
              <Link href={`/tenders/${tender.id}`}>{tender.title}</Link>
            </h2>
            <p className="card-description">{tender.description}</p>
            <div className="card-requirements">
              <Icon name="shield" size={16} />
              <span>{tender.requirements.length} eligibility requirements</span>
            </div>
            <div className="card-deadline">
              <Icon name="clock" size={16} />
              <span>
                Bidding deadline
                <strong>
                  <TenderDate value={tender.deadline} />
                </strong>
              </span>
            </div>
            <div className="card-footer">
              <span>
                {tender.id.startsWith("pt-")
                  ? tender.id.toUpperCase()
                  : "LOCAL TENDER"}
              </span>
              <Link
                href={`/tenders/${tender.id}${vendor ? "/participate" : ""}`}
              >
                {vendor ? "Participate" : "View tender"}
                <Icon name="arrow" size={17} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty panel">
          <h2>No matching tenders</h2>
          <p>Try a different search or status, or create your first tender.</p>
          <button
            className="button secondary"
            onClick={() => {
              setSearch("");
              setFilter("All tenders");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="board-bottom">
        <span>
          {visible.length} of {tenders.length} tenders
        </span>
        <span>PostgreSQL persistence · Browser-scoped demo workspace</span>
      </div>
      <div className="notice">
        <Icon name="shield" />
        <div>
          <strong>Confidential by design. Honest about the prototype.</strong>
          <p>
            Eligibility is simulated. Bid inputs are held in memory only, never
            added to public tender data.{" "}
            <Link href="/privacy" className="inline-link">
              Understand the privacy model
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
