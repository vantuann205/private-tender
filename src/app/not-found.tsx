import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p>Return to your procurement workspace.</p>
      <Link className="button" href="/">
        Tender board
      </Link>
    </div>
  );
}
