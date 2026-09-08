# PrivateTender

Privacy-first procurement: publish clear requirements, check vendor eligibility, and eventually select a winning bid without exposing unsuccessful bid amounts.

**Current progress: ~25%**

This first development pass is a database-backed prototype, not a deployed auction or a production-private bidding system. Neon PostgreSQL now persists public tender records; eligibility and bids remain local simulations.

## Implemented

- Responsive procurement workspace with tender board, search, status filters, detail, creation, and vendor participation routes.
- Public tender model: title, description, eligibility requirements, bidding deadline, winner rule, and Draft/Open/Closed status.
- PostgreSQL-persisted demo tenders isolated by anonymous browser workspace. Creation validates required fields, lengths, supported rules, and future deadlines on both client and server. Open tenders derive Closed at their deadline.
- Development eligibility adapter with eligible/ineligible states and tender binding.
- Bid input simulation that rechecks eligibility, current deadline, and decimal amount before returning an amount-free local receipt.
- Domain/client/API-boundary tests, an opt-in real-database API integration check, and a compile-checked Compact foundation.

## Privacy model and limitations

Public tender fields are allow-listed before entering application state; private amount fields are not part of the `Tender` type or database schema. Only those public-model fields are sent to the tender API and stored in PostgreSQL. Bid inputs remain in component memory and are discarded on successful simulation or navigation. Receipts contain no amount and are not persisted. No bid API, analytics, bid logging, or blockchain call is made.

This is **separation of data, not cryptographic privacy**. Do not enter actual prices, identity information, or credentials. Database operators can read tender records; this is not end-to-end encryption. Browser extensions, developer tools, or compromised devices can inspect form input. Eligibility is a self-attestation stub, not an authenticated proof.

On first successful API read, the server generates a random 32-byte workspace token. It is kept in a 30-day HttpOnly, SameSite=Lax, path `/` cookie, with Secure and a `__Host-` prefix in production. Only its SHA-256 hash is stored in `pt_workspaces`. All queries and inserts are scoped to that hash; the raw token/hash is not included in tender JSON. This is **anonymous bearer-token isolation, not a login or verified organization**. Anyone holding the cookie has access. A different browser, cleared/expired cookie, or new deployment domain starts a different workspace; there is no recovery or sharing flow. Clearing cookies does not delete database records. Retention cleanup, user-facing deletion, and production abuse/rate limiting remain unimplemented; only fictional data should be used.

Each workspace is capped at 500 tenders, with a workspace-row lock preventing concurrent creates from exceeding the cap. Two browser tabs with the same cookie share the same persisted state; navigation/reload fetches the latest records, not real-time subscriptions. API mutations require an exact same-origin `Origin`, JSON content type, a body no larger than 32 KiB, and supported fields only. Drizzle parameterizes queries. Old localStorage demo records are not imported, modified, or used as fallback. Database failures show a retryable error.

Sample tender deadlines are generated on the first visit and then persisted, so they naturally close as time passes. Deadlines are entered in browser-local time, saved as ISO timestamps, and shown in UTC on detail screens. The display refreshes on navigation/state changes, while submission always rechecks the current time. The browser clock is not an authoritative blockchain clock.

Drafts can be created and viewed, but draft editing/publishing is not in this pass. Winner rules are recorded only; no winner is selected.

## Stack and organization

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, ESLint 9, pnpm 10, Neon PostgreSQL, Drizzle ORM, and node-postgres (`pg`). Tests use Node's built-in runner through `tsx`.

```text
src/app/                   App Router routes and global styles
src/features/tenders/      Public domain model, persistence, board, detail, creation
src/features/vendors/      Eligibility boundary and participation screen
src/features/bidding/      Private input validation and receipt boundary
src/components/            Shared shell and icons
src/lib/db/                Server-only pooled connection and Drizzle schema
src/app/api/               Workspace-scoped tender API and generic health probe
drizzle/                   Checked-in SQL migration and Drizzle metadata
scripts/                   Migration and opt-in real API integration checks
contracts/                 Compact source and integration notes
tests/                     Domain and storage behavior checks
```

One Next.js codebase. No separate backend, no monorepo, and no unnecessary blockchain dependencies before integration.

## Local setup

Use Node.js 22.13+ (validated here with Node 24) and Corepack or pnpm 10.18.3.

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm db:migrate
corepack pnpm dev
```

Before migrating/running, create ignored `.env.local` from `.env.example` and set `DATABASE_URL` to the Neon pooled URL and `DATABASE_URL_UNPOOLED` to the direct URL. Use TLS connection settings supplied by Neon; certificate verification is not disabled. The migration command loads `.env` then `.env.local`; injected environment variables take precedence. Migration rejects a `-pooler` hostname. A direct local PostgreSQL `DATABASE_URL` can be used without the optional unpooled variable.

Open http://localhost:3000. Never place credentials in `NEXT_PUBLIC_*` variables or commit them. Production hosts need server-only `DATABASE_URL`; migrations are a separate operator step, not a build/start side effect. `/api/health` returns only `ok` or `unavailable`, never connection details. Build/typecheck do not need a database URL; tender APIs return generic 503 errors until the database and migration are available.

The shared pool uses at most 3 connections per process, 10-second connection/idle/statement timeouts, and attaches to Vercel Fluid lifecycle when running on Vercel. Connection budgets still scale with instances. References: [Neon with Drizzle](https://neon.com/docs/guides/drizzle), [pg pool configuration](https://node-postgres.com/apis/pool), and [Vercel database pooling](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm start
```

The initial schema is in `drizzle/0000_initial_workspace_tenders.sql`; `db:migrate` uses Drizzle’s migration journal and is safe to repeat. `db:generate` generates the next migration after a schema change. Run migrations on a development Neon branch before production.

For opt-in integration testing, migrate a disposable/test database, start the app against that same database, then run `corepack pnpm test:api` with `DATABASE_URL` and `TEST_BASE_URL` (defaults to `http://localhost:3111`). It checks persistence across requests, seed-once behavior, two-workspace isolation, cookie flags, mutation guards, database-scoped records, and concurrent enforcement of the 500-record cap; it deletes only the fictional workspaces it created. It intentionally fails if database configuration is missing rather than silently reporting success.

`lint` uses a supported Next.js flat config with ESLint 9; the upstream package currently emits a deprecation notice on installation, but lint is clean. A future tooling upgrade can move to ESLint 10 once the Next.js peer range supports it.

## Demonstration path

1. Open `/`; filter or search the four sample tenders.
2. Open `/tenders/new`; create an Open tender with a future deadline. Reload its detail page to check persistence.
3. Select **Participate in tender**. Click **Prove Eligibility** without checking the box to see Not eligible.
4. Check the self-attestation box, then **Prove Eligibility**. Enter a fictional amount and select **Submit demo bid**.
5. Verify the amount-free local receipt, then return to the board. No amount is published or persisted.
6. Draft and Closed samples do not permit participation. `/privacy` explains all trust boundaries.

Use a different browser profile for a second isolated workspace. Clearing the workspace cookie starts fresh samples but does not delete old database records. Do not clear it if you need continued access.

## Midnight / Compact status

`contracts/private-tender.compact` was compiled with **Compact compiler 0.26.0, language 0.18.0, `--skip-zk`**. It represents creation, status, deadline assertions, eligibility witnesses, and positive private bid input. No amount is written to public ledger state.

**Prototype only:** untrusted eligibility witnesses, no owner authorization, no retained bid commitments, and no winning-bid algorithm. The UI does not call this contract. No proving keys, real ZK proofs, wallet transactions, or deployment have been produced. See [contract notes](contracts/README.md) for the reproducible compilation command and official references.

## Next milestones

1. Trusted issuer eligibility predicates and organization authorization; compatible wallet/proof-server integration.
2. Tender-bound salted commitments, private bid state, and duplicate protection with real proof tests.
3. Confidential winner evaluation after the deadline and public verification of the result.

Anonymous reviewers, private multicriteria scoring, dispute governance, and production settlement are intentionally excluded from this pass.
