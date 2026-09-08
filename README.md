# PrivateTender

Privacy-first procurement: publish clear requirements, check vendor eligibility, and eventually select a winning bid without exposing unsuccessful bid amounts.

**Current progress: ~25%**

This first development pass is a local-only prototype, not a deployed auction or a production-private bidding system.

## Implemented

- Responsive procurement workspace with tender board, search, status filters, detail, creation, and vendor participation routes.
- Public tender model: title, description, eligibility requirements, bidding deadline, winner rule, and Draft/Open/Closed status.
- Locally persisted demo tenders. New forms validate required fields, lengths, supported rules, and future deadlines. Open tenders derive Closed at their deadline.
- Development eligibility adapter with eligible/ineligible states and tender binding.
- Bid input simulation that rechecks eligibility, current deadline, and decimal amount before returning an amount-free local receipt.
- Feature-level domain tests, malformed-storage checks, and a compile-checked Compact foundation.

## Privacy model and limitations

Public tender fields are allow-listed before entering application state; private amount fields are not part of the `Tender` type. Only public tenders use local storage. Bid inputs remain in component memory and are discarded on successful simulation or navigation. Receipts contain no amount and are not persisted. No bid API, analytics, logging, or blockchain call is made.

This is **separation of data, not cryptographic privacy**. Do not enter actual prices, identity information, or credentials. Local storage is readable and writable by anyone with access to the browser profile, and browser extensions or developer tools can inspect form input. Eligibility is a self-attestation stub, not an authenticated proof. There is no account access control. The local demo supports at most 500 tenders; tabs/browsers are not synchronized and concurrent tabs may overwrite each other's additions. Use one tab for the demonstration.

Sample tender deadlines are generated on the first visit and then persisted, so they naturally close as time passes. Deadlines are entered in browser-local time, saved as ISO timestamps, and shown in UTC on detail screens. The display refreshes on navigation/state changes, while submission always rechecks the current time. The browser clock is not an authoritative blockchain clock.

Drafts can be created and viewed, but draft editing/publishing is not in this pass. Winner rules are recorded only; no winner is selected.

## Stack and organization

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, ESLint 9, pnpm 10. Tests use Node's built-in runner through `tsx`.

```text
src/app/                   App Router routes and global styles
src/features/tenders/      Public domain model, persistence, board, detail, creation
src/features/vendors/      Eligibility boundary and participation screen
src/features/bidding/      Private input validation and receipt boundary
src/components/            Shared shell and icons
contracts/                 Compact source and integration notes
tests/                     Domain and storage behavior checks
```

One Next.js codebase. No separate backend, no monorepo, and no unnecessary blockchain dependencies before integration.

## Local setup

Use Node.js 22.13+ (validated here with Node 24) and Corepack or pnpm 10.18.3.

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open http://localhost:3000. `.env.example` documents the key-free demo configuration; no `.env` file is required. Never place secrets in `NEXT_PUBLIC_*` variables.

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm start
```

`lint` uses a supported Next.js flat config with ESLint 9; the upstream package currently emits a deprecation notice on installation, but lint is clean. A future tooling upgrade can move to ESLint 10 once the Next.js peer range supports it.

## Demonstration path

1. Open `/`; filter or search the four sample tenders.
2. Open `/tenders/new`; create an Open tender with a future deadline. Reload its detail page to check persistence.
3. Select **Participate in tender**. Click **Prove Eligibility** without checking the box to see Not eligible.
4. Check the self-attestation box, then **Prove Eligibility**. Enter a fictional amount and select **Submit demo bid**.
5. Verify the amount-free local receipt, then return to the board. No amount is published or persisted.
6. Draft and Closed samples do not permit participation. `/privacy` explains all trust boundaries.

Clear this site's local storage through browser settings and reload to reset the samples. Corrupted storage is not silently overwritten: an actionable error is shown.

## Midnight / Compact status

`contracts/private-tender.compact` was compiled with **Compact compiler 0.26.0, language 0.18.0, `--skip-zk`**. It represents creation, status, deadline assertions, eligibility witnesses, and positive private bid input. No amount is written to public ledger state.

**Prototype only:** untrusted eligibility witnesses, no owner authorization, no retained bid commitments, and no winning-bid algorithm. The UI does not call this contract. No proving keys, real ZK proofs, wallet transactions, or deployment have been produced. See [contract notes](contracts/README.md) for the reproducible compilation command and official references.

## Next milestones

1. Trusted issuer eligibility predicates and organization authorization; compatible wallet/proof-server integration.
2. Tender-bound salted commitments, private bid state, and duplicate protection with real proof tests.
3. Confidential winner evaluation after the deadline and public verification of the result.

Anonymous reviewers, private multicriteria scoring, dispute governance, and production settlement are intentionally excluded from this pass.
