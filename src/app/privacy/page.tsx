import Link from "next/link";
import { Icon } from "@/components/icon";
export default function PrivacyPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Privacy, without the fine print.</h1>
          <p>What this first pass does—and what it does not.</p>
        </div>
      </div>
      <div className="notice">
        <Icon name="shield" />
        <div>
          <strong>Current progress: ~25%</strong>
          <p>
            A database-backed product prototype. No live Midnight connection,
            wallet, or production privacy guarantees.
          </p>
        </div>
      </div>
      <article className="prose">
        <h2>Public tender state</h2>
        <p>
          Titles, descriptions, requirements, deadlines, status, and winner
          rules are saved in Neon PostgreSQL through this app’s server. These
          public-model fields are scoped to your anonymous browser workspace,
          not published to an on-chain registry. The database operator can read
          them; this is not end-to-end encryption. Only fictional data belongs
          here.
        </p>
        <h2>Your browser holds the workspace key</h2>
        <p>
          A random 32-byte token is stored in an HttpOnly, SameSite=Lax cookie
          (Secure on the hosted site). The database stores only its SHA-256
          hash. Every tender read and write is scoped to that hash. The cookie
          lasts 30 days. Anyone holding it can access the workspace: this is
          bearer-token isolation, not verified identity, organization login, or
          account recovery. Clearing cookies, changing browser, or cookie expiry
          starts a new workspace.
        </p>
        <h2>Private bid input</h2>
        <p>
          The bid amount stays in the participation screen’s memory. On
          submission, the development adapter validates it and discards it. No
          amount is added to the tender model, stored in PostgreSQL, logged, or
          sent over the network. The local receipt contains no amount and
          disappears on navigation or reload.
        </p>
        <p>
          This is data separation, not encryption or zero-knowledge privacy.
          Browser extensions, developer tools, or a compromised device may read
          form inputs. Use fictional data only.
        </p>
        <h2>Eligibility is simulated</h2>
        <p>
          “Prove Eligibility” uses your self-attestation to show the eligible or
          ineligible branch. It does not verify a credential, business identity,
          or cryptographic proof. The isolated development adapter will be
          replaced by a real Midnight integration.
        </p>
        <h2>Midnight foundation</h2>
        <p>
          The repository includes a Compact contract skeleton checked with
          compiler 0.26.0 and language 0.18.0 using <code>--skip-zk</code>. It
          models public tender state, deadline assertions, eligibility
          witnesses, and private bid input. It has no authorization or
          credential validation and must not be deployed.
        </p>
        <h2>Intentionally next</h2>
        <ul>
          <li>
            Wallet connection, trusted credentials, proof generation, and
            deployment.
          </li>
          <li>
            Authenticated organization storage and tender lifecycle editing.
          </li>
          <li>
            Confidential bid commitments and duplicate participation controls.
          </li>
          <li>
            Winner selection, settlement, and verifiable results without
            exposing losing bids.
          </li>
        </ul>
        <h2>Data lifetime and availability</h2>
        <p>
          Clearing the cookie does not delete existing database records. This
          pass has no account recovery, user-facing deletion, automatic
          retention cleanup, or production abuse protection. Database outages
          show an error; the app never falls back to local storage. Old
          local-demo records are not automatically imported or erased. Use
          fictional data only.
        </p>
        <Link className="button secondary" href="/">
          Back to tender board
        </Link>
      </article>
    </>
  );
}
