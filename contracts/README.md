# Compact foundation — not deployable

`private-tender.compact` is a first-pass, single-tender contract concept. It was compiled with **Compact compiler 0.26.0 / language 0.18.0**, using `--skip-zk`. That checks language/type/disclosure compilation and emits development artifacts; it does **not** generate proving keys, execute proofs, validate live ledger behavior, or deploy a contract.

```sh
pnpm install --frozen-lockfile
pnpm test:contract
```

The runner requires compiler 0.26.0 on PATH (on Windows, inside WSL), compiles the source afresh with `--skip-zk` into ignored `.compact-generated/`, and executes the emitted contract using pinned Compact runtime 0.9.0 / onchain-runtime 0.3.0. It does not substitute a TypeScript lifecycle model. Twenty local runtime tests cover owner authorization, deadlines, duplicate rejection, independent vendors, amount/salt and tender binding, and absence of raw private fixture values in public ledger/transcript data. Opening's emitted transcript fails replay at/after the deadline; the bid transcript applies its commitment/count and fails replay once its nullifier exists. These are simulated query contexts, not cryptographic proof or live-network tests. Fixture leakage checks are regression checks, not a formal privacy proof.

The constructor rejects a zero deadline. It cannot establish deployment-time freshness: this compiler's constructor context has no supplied block time. Opening and bidding require kernel block time strictly less than the deadline; closing requires strictly greater. At equality neither bidding nor closing is allowed. Tests at deadline minus one, equality, and plus one verify those local runtime boundaries. A nonzero `secondsSinceEpochErr` characterization shows this pinned query runtime still compares the supplied time, not a conservative uncertainty interval. Consensus transaction validity windows and uncertainty enforcement remain unvalidated. Browser deadlines use local wall-clock time and are not network-authoritative.

Opening and closing require knowledge of the constructor's private 32-byte owner secret, checked against a public persistent hash with domain prefix `private-tender:owner:v1`. Providing the public commitment as a secret fails. This is secret-possession authorization, not verified organization identity or wallet-signature binding. Use a fresh cryptographically random 32-byte secret per tender; do not reuse passwords, wallet seeds, or the public deterministic test fixtures. No custody, recovery, rotation, or organization enrollment exists. Losing the secret prevents owner operations; leaking it grants those operations. Only the commitment is disclosed to the ledger.

Submission privately reads a vendor secret, positive Uint64 amount, and 32-byte bid salt. Its public nullifier is `persistentHash([pad(32, "private-tender:vendor:v1"), kernel.self().bytes, requirementsDigest, vendorSecret])`. The public map stores `nullifier → persistentCommit(Bid { domain: pad(32, "private-tender:bid:v1"), nullifier, amount }, salt)`. The nullifier binds the commitment to both contract address and requirements. A nullifier already in the map is rejected before inserting or incrementing the count, including when amount/salt change. Domain separation keeps owner identity, vendor pseudonym, and bid commitment distinct.

Only the nullifier, opaque commitment, and participation count are recorded publicly—not raw amount, vendor secret, or salt. The client must eventually retain those private inputs securely for any future reveal; no durable private-state storage or recovery exists here. Generate high-entropy cryptographically random secrets and fresh salts; deterministic test fixtures are public and must never be used for real bids. Losing a salt/amount prevents reconstructing that commitment; leaking them compromises bid privacy. Amount units are not defined and no payment occurs.

Duplicate resistance is **per secret per tender**, not per verified vendor. A fresh secret is a fresh pseudonym and can submit again; there is no issuer-bound identity or Sybil protection. Witness eligibility is still untrusted self-attestation and does not prove credentials. The requirements digest is not bound to a credential predicate. This contract **cannot settle, reveal, or recover bids**. There is no production threat model, wallet binding, payment, winner evaluation, or integration with the UI. Do not deploy or send assets to this skeleton.

Next integration work: select/pin compatible SDK and proof-server releases, add verified organization enrollment and issuer-bound vendor identity/eligibility, implement durable private input custody, generate and test proofs, then connect the development adapter. Reveal, settlement, and the private winning-bid algorithm are outside this pass.

Official references checked during implementation:

- [Compact reference](https://docs.midnight.network/compact/reference/compact-reference): ledger, witness, circuit, and explicit-disclosure model.
- [Standard library reference](https://docs.midnight.network/compact/standard-library/exports): library concepts and kernel direction. Current online docs can be newer than the pinned local compiler.
- [Compact releases](https://github.com/midnightntwrk/compact/releases): compiler/language version history.
- [Kernel reference](https://docs.midnight.network/compact/reference/ledger-adt#kernel): time predicates for this language generation.
- [Official secret-derived identity example](https://github.com/midnightntwrk/example-zkloan/blob/main/blog-post.md): why a claimed `ownPublicKey()` is not owner authorization.

Generated artifacts are ignored. No keys or generated proof material are committed. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` separately for the disconnected web prototype; none exercises contract proofs.
