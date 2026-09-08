"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><Icon name="shield" size={24} /></span>PrivateTender<span className="brand-dot">.</span></Link>
      <div className="workspace"><span className="workspace-avatar">N</span><div><strong>Northstar Collective</strong><small>Procurement workspace</small></div></div>
      <nav aria-label="Main navigation">
        <Link className={path === "/" || path.startsWith("/tenders/") && path !== "/tenders/new" ? "nav-item active" : "nav-item"} href="/"><Icon name="grid" />Tender board</Link>
        <Link className={path === "/tenders/new" ? "nav-item active" : "nav-item"} href="/tenders/new"><Icon name="plus" />Create tender</Link>
        <Link className={path === "/participate" ? "nav-item active" : "nav-item"} href="/participate"><Icon name="shield" />Vendor participation</Link>
        <Link className={path === "/privacy" ? "nav-item active" : "nav-item"} href="/privacy"><Icon name="lock" />Privacy & development</Link>
      </nav>
      <div className="sidebar-bottom"><Icon name="lock" /><strong>Built for discretion.</strong><p>Clear requirements.<br />Confidential participation.</p><span>First pass · Local demo</span></div>
      <div className="profile"><span className="profile-avatar">NC</span><div>Demo organization<small>No wallet connected</small></div></div>
    </aside>
    <div className="main-wrap"><header className="topbar"><span>Workspace <span className="muted">/</span> Procurement</span><span className="demo-indicator"><i />Local demo</span></header><main id="main" className="main-content">{children}</main><footer className="footer">PrivateTender <span>Public requirements. Private intentions.</span><span>Midnight integration · prototype</span></footer></div>
  </div>;
}
