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
          <strong>Current progress: ~60%</strong>
          <p>
            A database-backed workflow plus verified Midnight Preprod contract
            deployments. The browser is not yet connected to a Midnight wallet.
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
          The browser hashes the tender ID, normalized amount, and a fresh
          private salt. Only the resulting 32-byte commitment is sent to and
          stored by the server. The amount and salt are never added to public
          tender data or request bodies. The receipt exposes the commitment and
          private salt locally so the vendor can retain its opening material.
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
          The Compact contract is release-compiled with compiler 0.31.1,
          language 0.23.0, and runtime 0.16.0. Three instances are verified on
          Preprod. They enforce owner authorization, vendor enrollment,
          lifecycle deadlines, private witnesses, and duplicate-resistant bid
          commitments. The hosted browser flow remains a separate adapter.
        </p>
        <h2>Intentionally next</h2>
        <ul>
          <li>
            Wallet connection, proof generation, and direct contract calls.
          </li>
          <li>
            Trusted issuer credentials and authenticated organization access.
          </li>
          <li>
            Durable vendor custody for amount/salt opening material.
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
