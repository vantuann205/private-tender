import { tenderStatus, type Tender } from "./domain";
export function StatusBadge({
  tender,
}: {
  tender: Pick<Tender, "status" | "deadline">;
}) {
  const status = tenderStatus(tender);
  return <span className={`status ${status.toLowerCase()}`}>{status}</span>;
}
export function TenderDate({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })}
    </time>
  );
}
