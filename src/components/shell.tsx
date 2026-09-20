"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="shield" size={24} />
          </span>
          PrivateTender<span className="brand-dot">.</span>
        </Link>
        <div className="workspace">
          <span className="workspace-avatar">L</span>
          <div>
            <strong>Lace wallet</strong>
            <small>Midnight Preprod</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <Link className={path === "/preprod" ? "nav-item active" : "nav-item"} href="/preprod">
            <Icon name="shield" />
            Tender workspace
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <Icon name="lock" />
          <strong>Built for discretion.</strong>
          <p>
            Clear requirements.
            <br />
            Confidential participation.
          </p>
          <span>Wallet-signed on Midnight Preprod</span>
        </div>
        <div className="profile">
          <span className="profile-avatar">L</span>
          <div>
            Lace extension<small>Connect to begin</small>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Wallet <span className="muted">/</span> Private tender
          </span>
          <span className="demo-indicator">
            <i />
            Preprod
          </span>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="footer">
          PrivateTender <span>Public requirements. Private intentions.</span>
          <span>Wallet-signed Preprod transactions</span>
        </footer>
      </div>
    </div>
  );
}
