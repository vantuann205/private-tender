# PrivateTender

[![PrivateTender CI](https://github.com/vantuann205/private-tender/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/vantuann205/private-tender/actions/workflows/ci.yml)
[![Midnight Preprod](https://img.shields.io/badge/Midnight-Preprod-6f4cff)](https://private-tender-ten.vercel.app/preprod)

[Live application](https://private-tender-ten.vercel.app) | [Preprod contract console](https://private-tender-ten.vercel.app/preprod) | [Product X profile](https://x.com/vtuann_13205)

## Level 4 - Waxing Gibbous submission

| Requirement | Status | Verifiable evidence |
|---|---:|---|
| Public GitHub repository | Complete | [vantuann205/private-tender](https://github.com/vantuann205/private-tender) |
| Working MVP live on Preprod | Complete | [Live product](https://private-tender-ten.vercel.app) and [wallet-signed Preprod console](https://private-tender-ten.vercel.app/preprod) |
| Verifiable contract address | Complete | [`59f7fd5365f79c901ae145ad60eb06b4539a94807ec200d3c525cb859f75eb68`](https://explorer.preprod.midnight.network/contracts/stream/59f7fd5365f79c901ae145ad60eb06b4539a94807ec200d3c525cb859f75eb68) |
| Preprod deployment proof | Complete | [Deployment transaction `00d62882...ce11`](https://explorer.preprod.midnight.network/transactions/00d62882525cfe7933dfdfd30e8674c5cc5d14b166580025e37edbf92c2d18ce11) and [machine-readable evidence](deployments/preprod.json) |
| README, setup and usage | Complete | [Local setup](#local-setup), [demonstration path](#demonstration-path), and [contract notes](contracts/README.md) |
| CI/CD pipeline | Complete | [GitHub Actions workflow](.github/workflows/ci.yml); successful `main` builds are automatically deployed by Vercel |
| Product X profile | Complete | [@vtuann_13205](https://x.com/vtuann_13205) |
| Minimum 15 meaningful commits | Complete | [47+ commits](https://github.com/vantuann205/private-tender/commits/main/) |

The hosted product combines a database-backed tender board with a dedicated Lace-signed Preprod console. Three independently funded Compact instances and their contract actions are publicly verifiable on Midnight Preprod.

Privacy-first procurement: publish clear requirements, check vendor eligibility, and eventually select a winning bid without exposing unsuccessful bid amounts.

This is not a production auction or settlement system. Neon PostgreSQL persists the tender workflow, while the `/preprod` console reads contract state and submits enrollment, lifecycle, private-bid, and deployment transactions through Lace.

## Implemented

- Responsive procurement workspace with tender board, search, status filters, detail, creation, and vendor participation routes.
- Public tender model: title, description, eligibility requirements, bidding deadline, winner rule, and Draft/Open/Closed status.
- PostgreSQL-persisted demo tenders isolated by anonymous browser workspace. Creation validates required fields, lengths, supported rules, and future deadlines on both client and server. Open tenders derive Closed at their deadline.
- Draft editing reuses the creation form; publishing opens a draft, and confirmed early closure permanently closes an open tender. Server-side workspace ownership and row locks protect each mutation. Opened contents are immutable and closed tenders cannot reopen.
- Development eligibility adapter with eligible/ineligible states and tender binding.
- Browser-generated bid commitments that refresh public tender state, then recheck eligibility, deadline, and decimal amount. Only a SHA-256 commitment is persisted; the amount and private salt never enter the request body. Accepted commitments return an amount-free server receipt and update the public count.
- Domain/client/API-boundary tests, an opt-in real-database API integration check, and a compiled-runtime-tested Compact foundation.

## Privacy model and limitations

Public tender fields are allow-listed before entering application state; private amount and salt fields are not part of the `Tender` type or database schema. The browser hashes a versioned payload containing the tender ID, amount in cents, and a random 32-byte salt. The bid endpoint accepts exactly one lowercase 32-byte commitment. PostgreSQL stores the commitment, tender binding, receipt ID, and timestamp; public reads expose only the aggregate commitment count. No amount, salt, vendor identity, analytics payload, or blockchain call is sent.

This is **separation of data, not cryptographic privacy**. Do not enter actual prices, identity information, or credentials. Database operators can read tender records; this is not end-to-end encryption. Browser extensions, developer tools, or compromised devices can inspect form input. Eligibility is a self-attestation stub, not an authenticated proof.

On first successful API read, the server generates a random 32-byte workspace token. It is kept in a 30-day HttpOnly, SameSite=Lax, path `/` cookie, with Secure and a `__Host-` prefix in production. Only its SHA-256 hash is stored in `pt_workspaces`. All queries and inserts are scoped to that hash; the raw token/hash is not included in tender JSON. This is **anonymous bearer-token isolation, not a login or verified organization**. Anyone holding the cookie has access. A different browser, cleared/expired cookie, or new deployment domain starts a different workspace; there is no recovery or sharing flow. Clearing cookies does not delete database records. Retention cleanup, user-facing deletion, and production abuse/rate limiting remain unimplemented; only fictional data should be used.

Each workspace is capped at 500 tenders, with a workspace-row lock preventing concurrent creates from exceeding the cap. Two browser tabs with the same cookie share the same persisted state; navigation/reload fetches the latest records, not real-time subscriptions. API mutations require an exact same-origin `Origin`, JSON content type, a body no larger than 32 KiB, and supported fields only. Drizzle parameterizes queries. Old localStorage demo records are not imported, modified, or used as fallback. Database failures show a retryable error.

Sample tender deadlines are generated on the first visit and then persisted, so they naturally close as time passes. Deadlines are entered in browser-local time, saved as ISO timestamps, and shown in UTC on detail screens. The display refreshes on navigation/state changes, while submission always rechecks the current time. The browser clock is not an authoritative blockchain clock.

Drafts can be edited and published from their detail screen. Both saving and publishing require a future deadline checked by the server. Open tenders may be closed early after confirmation. Content cannot change after opening; neither reopening nor deleting is implemented. Every edit/publish/close locks and reads the workspace-owned database row before applying a change, so simultaneous lifecycle requests cannot both succeed. Concurrent draft edits are serialized with the last accepted edit winning; revision history and edit merging are not implemented. Winner rules are recorded only; no winner is selected.

The bid endpoint locks and rechecks the workspace-owned tender before insertion, so a closed or expired tender cannot accept a new commitment. This is atomic database acceptance, not a Midnight proof or authoritative ledger clock. The hosted UI and deployed Compact instances remain separate.

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
drizzle/                   Tender and opaque bid-commitment migrations
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

For opt-in integration testing, migrate a disposable/test database, start the app against that same database, then run `corepack pnpm test:api` with `DATABASE_URL` and `TEST_BASE_URL` (defaults to `http://localhost:3111`). It checks persistence across requests, seed-once behavior, two-workspace isolation, cookie flags, mutation guards, draft editing, expired-draft publication rejection, post-open immutability, concurrent publish/close, and concurrent enforcement of the 500-record cap; it deletes only the fictional workspaces it created. It intentionally fails if database configuration is missing rather than silently reporting success.

`lint` uses a supported Next.js flat config with ESLint 9; the upstream package currently emits a deprecation notice on installation, but lint is clean. A future tooling upgrade can move to ESLint 10 once the Next.js peer range supports it.

## Demonstration path

1. Open `/`; filter or search the four sample tenders.
2. Open `/tenders/new`; create a Draft tender with a future deadline. Edit its details, save, and reload to check persistence. Select **Publish tender** to open participation and lock the details.
3. Select **Participate in tender**. Click **Prove Eligibility** without checking the box to see Not eligible.
4. Check the self-attestation box, then **Prove Eligibility**. Enter a fictional amount and select **Submit private commitment**.
5. Save the displayed private salt and verify the amount-free server receipt. Return to the board and observe only the commitment count; no amount is published or persisted.
6. Use **Close tender**, then **Confirm close** to end bidding early; reload to verify closure. Draft and Closed tenders do not permit participation or reopening. `/privacy` explains all trust boundaries.

Use a different browser profile for a second isolated workspace. Clearing the workspace cookie starts fresh samples but does not delete old database records. Do not clear it if you need continued access.

## Midnight / Compact status

`contracts/private-tender.compact` is release-compiled with **Compact compiler 0.31.1, language 0.23.0, and runtime 0.16.0**. The full build generates prover, verifier, and ZKIR assets; 24 contract/runtime tests cover owner authorization, vendor enrollment, deadlines, salted bid commitments, privacy boundaries, and replay rejection.

Three distinct Preprod instances were deployed from three wallet addresses. Every listed transaction was read back from the indexer with status `SucceedEntirely`; the complete machine-readable record is [deployments/preprod.json](deployments/preprod.json).

| Instance | Contract | Deployment | Verified smoke activity |
|---|---|---|---|
| 02 | [`59f7fd53…eb68`](https://explorer.preprod.midnight.network/contracts/stream/59f7fd5365f79c901ae145ad60eb06b4539a94807ec200d3c525cb859f75eb68) | [`00d62882…ce11`](https://explorer.preprod.midnight.network/transactions/00d62882525cfe7933dfdfd30e8674c5cc5d14b166580025e37edbf92c2d18ce11) | [`enrollVendor`](https://explorer.preprod.midnight.network/transactions/0089b4b8c144bdaafda3ad87db5b390504d02f7e4b4ef3c626c009014e8f957980) |
| 03 | [`e836c3ac…8ad3`](https://explorer.preprod.midnight.network/contracts/stream/e836c3acca7b54beaeab1c0df3c8b115fa76c8b4302fc0b0b221f1614fe48ad3) | [`00669743…d531`](https://explorer.preprod.midnight.network/transactions/00669743ac63c42003b4f8d31c7174c3d9d9348c6b732472e112ee345ecb5bd531) | [`enrollVendor`](https://explorer.preprod.midnight.network/transactions/009d3f4e974f4526ad5507cba4eb9e9e395fae2f0fb12915f7b510e09c421b2082) |
| imported | [`8188ed97…ef9d`](https://explorer.preprod.midnight.network/contracts/stream/8188ed97c3e3ca5c43c7fa71796f1a9cf47affbf84d554d12c0d440076efef9d) | [`00358a5f…b99`](https://explorer.preprod.midnight.network/transactions/00358a5f272d11b4f38e8b78b73a177f58cd3d014d48097efd5fb7e869ed764b99) | [`enroll → open → bid`](https://explorer.preprod.midnight.network/transactions/009530c489fd94aaeb213a21a8b9334d018ddcccf10c5e177db822ba31aa65da3a) |

Only opaque commitments are retained; duplicate bids under the same enrolled secret are rejected even when amount or salt changes. This is pseudonymous duplicate resistance, not one-real-vendor enforcement: a fresh approved secret is a different participant. No reveal, winner selection, escrow, or settlement circuit exists. The tender board remains database-backed; all wallet-signed Midnight actions are isolated in the hosted `/preprod` console. See [contract notes](contracts/README.md).

## Next milestones

1. Trusted issuer eligibility predicates and verified organization enrollment beyond secret-possession authorization; browser wallet/proof-server integration.
2. Durable private bid/secret/salt custody and issuer-bound vendor uniqueness; validate commitments and duplicate rejection with real proof tests.
3. Confidential winner evaluation after the deadline and public verification of the result.

Anonymous reviewers, private multicriteria scoring, dispute governance, and production settlement are intentionally excluded from this pass.
