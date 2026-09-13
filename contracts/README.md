# PrivateTender Compact contract

The single-tender contract is release-compiled with Compact compiler **0.31.1**, language **0.23.0**, and `@midnight-ntwrk/compact-runtime` **0.16.0**.

```sh
corepack pnpm test:contract   # fast compiler/runtime regression suite
corepack pnpm contract:compile # complete prover, verifier, and ZKIR assets
```

Generated assets live in ignored `.compact-generated/private-tender/`. `contracts/preprod-adapter.mjs` exposes the generated ESM contract, strict witnesses, artifact directory, and a public-only state projection for the deployment runner.

## Contract flow

1. The constructor binds the deployment to an owner-secret commitment, deadline, and public requirements digest.
2. While status is `Draft`, only the owner can call `enrollVendor(commitment)`.
3. The owner calls `openTender()` before the deadline.
4. `submitPrivateBid()` derives an address- and requirements-bound vendor identity from the private vendor secret. The identity must already be enrolled.
5. The circuit records one opaque salted bid commitment per enrolled vendor and increments the public count atomically.
6. Only the owner can close the tender, strictly after the deadline.

Public state contains lifecycle status, deadline, requirements digest, owner commitment, enrolled vendor commitments, bid nullifiers/commitments, and submission count. Private witnesses are the owner secret, vendor secret, bid amount, and bid salt. Never derive these secrets from a wallet recovery phrase or publish private transcript outputs.

Enrollment proves only that the tender owner approved a commitment; it does not prove a legal identity or prevent one organization from controlling multiple secrets. Bid reveal, winner selection, settlement, secret recovery/rotation, and escrow are outside this contract. The hosted browser workflow remains database-backed and does not submit Midnight transactions.

Confirmed Preprod addresses and transaction evidence are added only after indexer verification.
