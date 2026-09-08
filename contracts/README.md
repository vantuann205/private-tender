# Compact foundation — not deployable

`private-tender.compact` is a first-pass, single-tender contract concept. It was compiled with **Compact compiler 0.26.0 / language 0.18.0**, using `--skip-zk`. That checks language/type/disclosure compilation and emits development artifacts; it does **not** generate proving keys, execute proofs, validate live ledger behavior, or deploy a contract.

```sh
compactc --skip-zk contracts/private-tender.compact /tmp/private-tender-compact-check
```

The source represents tender creation through its constructor, Draft/Open/Closed state, a public deadline and requirements digest, witness-based eligibility and positive private bid input, and public participation count. It uses kernel time assertions as a foundation; transaction validity windows and exact boundary behavior need runtime/integration testing. Browser deadlines currently use local wall-clock time and are not network-authoritative.

The amount is not disclosed or stored, so this contract **cannot settle or recover bids**. Witness eligibility is untrusted self-attestation and does not prove credentials. The requirements digest is not bound to a credential predicate yet. Opening has no owner authorization; closing and submissions have no production threat model. There is no duplicate protection, wallet binding, commitment/reveal protocol, payment, winner evaluation, or integration with the UI. Do not deploy or send assets to this skeleton.

Next integration work: select/pin compatible SDK and proof-server releases, add organization authorization and trusted eligibility predicates, design salted tender-bound commitments/private state, generate and test proofs, then connect the development adapter. The private winning-bid algorithm is intentionally outside this pass.

Official references checked during implementation:

- [Compact reference](https://docs.midnight.network/compact/reference/compact-reference): ledger, witness, circuit, and explicit-disclosure model.
- [Standard library reference](https://docs.midnight.network/compact/standard-library/exports): library concepts and kernel direction. Current online docs can be newer than the pinned local compiler.
- [Compact releases](https://github.com/midnightntwrk/compact/releases): compiler/language version history.

Generated artifacts live outside the repository. No keys or generated proof material are committed.
