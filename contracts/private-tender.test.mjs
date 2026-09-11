import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import * as runtime from '@midnight-ntwrk/compact-runtime';

const { Contract, ledger, TenderStatus } = createRequire(import.meta.url)('../.compact-generated/private-tender/contract/index.cjs');
const owner = new Uint8Array(32).fill(1);
const stranger = new Uint8Array(32).fill(2);
const vendor = new Uint8Array(32).fill(3);
const salt = new Uint8Array(32).fill(4);
const contract = new Contract({
  ownerSecret: ({ privateState }) => [privateState, privateState.secret],
  meetsRequirements: ({ privateState }) => [privateState, privateState.eligible],
  privateBidAmount: ({ privateState }) => [privateState, privateState.amount],
  vendorSecret: ({ privateState }) => [privateState, privateState.vendor],
  privateBidSalt: ({ privateState }) => [privateState, privateState.salt],
});

function tender(deadline = 1000n, requirements = new Uint8Array(32)) {
  return contract.initialState(runtime.constructorContext({ secret: owner, eligible: true, amount: 50n, vendor, salt }, '00'.repeat(32)), deadline, requirements);
}

function call(state, circuit, time = 900n, overrides = {}, uncertainty = 0, address = runtime.dummyContractAddress()) {
  const transactionContext = new runtime.QueryContext(state.currentContractState.data, address);
  transactionContext.block = { secondsSinceEpoch: time, secondsSinceEpochErr: uncertainty, blockHash: '00'.repeat(32) };
  const result = contract.circuits[circuit]({
    originalState: state.currentContractState,
    currentPrivateState: { ...state.currentPrivateState, ...overrides },
    currentZswapLocalState: state.currentZswapLocalState,
    transactionContext,
  });
  const currentContractState = new runtime.ContractState();
  currentContractState.data = result.context.transactionContext.state;
  return { currentContractState, currentPrivateState: result.context.currentPrivateState, currentZswapLocalState: result.context.currentZswapLocalState, result };
}

test('compiled lifecycle records participation and closes after deadline', () => {
  let state = tender();
  assert.equal(ledger(state.currentContractState.data).status, TenderStatus.Draft);
  state = call(state, 'openTender');
  state = call(state, 'submitPrivateBidConcept');
  assert.equal(ledger(state.currentContractState.data).submissionCount, 1n);
  state = call(state, 'closeTender', 1001n);
  assert.equal(ledger(state.currentContractState.data).status, TenderStatus.Closed);
});

test('only the constructor secret holder can open a tender', () => {
  const state = tender();
  assert.throws(() => call(state, 'openTender', 900n, { secret: stranger }), /owner/i);
  assert.equal(ledger(state.currentContractState.data).status, TenderStatus.Draft);
});

test('only the constructor secret holder can close a tender', () => {
  const state = call(tender(), 'openTender');
  assert.throws(() => call(state, 'closeTender', 1001n, { secret: stranger }), /owner/i);
  assert.equal(ledger(state.currentContractState.data).status, TenderStatus.Open);
});

test('creation rejects a zero deadline', () => {
  assert.throws(() => tender(0n), /deadline/i);
});

for (const time of [1000n, 1001n]) {
  test(`opening rejects deadline reached at ${time}`, () => {
    assert.throws(() => call(tender(), 'openTender', time), /deadline/i);
  });
}

test('the public owner commitment does not grant owner authority', () => {
  const state = tender();
  const secret = ledger(state.currentContractState.data).ownerCommitment;
  assert.throws(() => call(state, 'openTender', 900n, { secret }), /owner/i);
  assert.throws(() => call(call(state, 'openTender'), 'closeTender', 1001n, { secret }), /owner/i);
});

test('bids require an open tender and cannot land at or after its deadline', () => {
  assert.throws(() => call(tender(), 'submitPrivateBidConcept'), /not open/i);
  const state = call(tender(), 'openTender');
  for (const time of [1000n, 1001n]) {
    assert.throws(() => call(state, 'submitPrivateBidConcept', time), /deadline/i);
  }
  assert.equal(ledger(call(state, 'submitPrivateBidConcept', 999n).currentContractState.data).submissionCount, 1n);
});

test('ineligible or zero bids leave participation unchanged', () => {
  const state = call(tender(), 'openTender');
  assert.throws(() => call(state, 'submitPrivateBidConcept', 900n, { eligible: false }), /eligibility/i);
  assert.throws(() => call(state, 'submitPrivateBidConcept', 900n, { amount: 0n }), /positive/i);
  assert.equal(ledger(state.currentContractState.data).submissionCount, 0n);
});

test('closing requires strictly past deadline and lifecycle cannot replay', () => {
  const state = call(tender(), 'openTender');
  assert.throws(() => call(tender(), 'closeTender', 1001n), /not open/i);
  assert.throws(() => call(state, 'openTender'), /draft/i);
  for (const time of [999n, 1000n]) assert.throws(() => call(state, 'closeTender', time), /deadline/i);
  const closed = call(state, 'closeTender', 1001n);
  assert.throws(() => call(closed, 'closeTender', 1002n), /not open/i);
  assert.throws(() => call(closed, 'openTender', 1002n), /draft/i);
  assert.throws(() => call(closed, 'submitPrivateBidConcept', 1002n), /not open/i);
});

test('pinned runtime compares supplied block time despite nonzero uncertainty', () => {
  // Characterizes the real 0.3.0 query runtime, not network validity-window enforcement.
  const state = call(tender(), 'openTender', 999n, {}, 2);
  assert.equal(ledger(call(state, 'submitPrivateBidConcept', 999n, {}, 2).currentContractState.data).submissionCount, 1n);
  assert.throws(() => call(state, 'submitPrivateBidConcept', 1000n, {}, 2), /deadline/i);
  assert.throws(() => call(state, 'closeTender', 1000n, {}, 2), /deadline/i);
  assert.equal(ledger(call(state, 'closeTender', 1001n, {}, 2).currentContractState.data).status, TenderStatus.Closed);
});

test('opening transcript cannot be replayed against an expired ledger time', () => {
  const state = tender();
  const { result } = call(state, 'openTender', 999n);
  const transcript = { gas: 1000000000n, effects: result.context.transactionContext.effects, program: result.proofData.publicTranscript };
  for (const time of [999n, 1000n, 1001n]) {
    const replay = new runtime.QueryContext(state.currentContractState.data, runtime.dummyContractAddress());
    replay.block = { secondsSinceEpoch: time, secondsSinceEpochErr: 0, blockHash: '00'.repeat(32) };
    const run = () => replay.runTranscript(transcript, runtime.CostModel.dummyCostModel());
    if (time === 999n) assert.doesNotThrow(run);
    else assert.throws(run);
  }
});

test('same vendor cannot submit again even after changing private amount and salt', () => {
  const state = call(call(tender(), 'openTender'), 'submitPrivateBidConcept');
  for (const overrides of [{}, { amount: 70n }, { salt: stranger }, { amount: 70n, salt: stranger }]) {
    assert.throws(() => call(state, 'submitPrivateBidConcept', 900n, overrides), /already submitted/i);
  }
  assert.equal(ledger(state.currentContractState.data).submissionCount, 1n);
});

test('submission retains one opaque commitment keyed by its vendor nullifier', () => {
  const state = call(call(tender(), 'openTender'), 'submitPrivateBidConcept');
  const bids = ledger(state.currentContractState.data).bidCommitments;
  assert.ok(bids, 'bid commitment ledger must exist');
  const entries = [...bids];
  assert.equal(entries.length, 1);
  assert.equal(entries[0][0].length, 32);
  assert.equal(entries[0][1].length, 32);
  assert.notDeepEqual(entries[0][0], vendor);
  assert.notDeepEqual(entries[0][1], salt);
});

test('a distinct vendor secret adds an entry without overwriting the first bid', () => {
  const first = call(call(tender(), 'openTender'), 'submitPrivateBidConcept');
  const [key, commitment] = [...ledger(first.currentContractState.data).bidCommitments][0];
  const second = call(first, 'submitPrivateBidConcept', 900n, { vendor: stranger });
  const state = ledger(second.currentContractState.data);
  assert.equal(state.submissionCount, 2n);
  assert.equal(state.bidCommitments.size(), 2n);
  assert.deepEqual(state.bidCommitments.lookup(key), commitment);
});

test('bid commitment binds amount and salt while nullifier is stable', () => {
  const open = call(tender(), 'openTender');
  const entry = (overrides) => [...ledger(call(open, 'submitPrivateBidConcept', 900n, overrides).currentContractState.data).bidCommitments][0];
  const [nullifier, commitment] = entry({});
  for (const overrides of [{ amount: 51n }, { salt: stranger }]) {
    const changed = entry(overrides);
    assert.deepEqual(changed[0], nullifier);
    assert.notDeepEqual(changed[1], commitment);
  }
});

test('nullifier and commitment bind contract address and tender requirements', () => {
  const open = call(tender(), 'openTender');
  const original = [...ledger(call(open, 'submitPrivateBidConcept').currentContractState.data).bidCommitments][0];
  const otherAddress = [...ledger(call(open, 'submitPrivateBidConcept', 900n, {}, 0, runtime.decodeContractAddress(stranger)).currentContractState.data).bidCommitments][0];
  const otherRequirements = [...ledger(call(call(tender(1000n, stranger), 'openTender'), 'submitPrivateBidConcept').currentContractState.data).bidCommitments][0];
  for (const changed of [otherAddress, otherRequirements]) {
    assert.notDeepEqual(changed[0], original[0]);
    assert.notDeepEqual(changed[1], original[1]);
  }
});

test('public ledger and transcript omit raw bid amount, vendor secret, and salt', () => {
  const amount = 0x123456789abcdef0n;
  const { currentContractState, result } = call(call(tender(), 'openTender'), 'submitPrivateBidConcept', 900n, { amount });
  const publicData = JSON.stringify({
    ledger: currentContractState.data.encode(),
    transcript: result.proofData.publicTranscript,
    input: result.proofData.input,
    output: result.proofData.output,
  }, (_, value) => value instanceof Uint8Array ? Buffer.from(value).toString('hex') : typeof value === 'bigint' ? value.toString() : value);
  const encodedAmount = Buffer.alloc(8);
  encodedAmount.writeBigUInt64LE(amount);
  for (const raw of [amount.toString(), encodedAmount.toString('hex'), Buffer.from(vendor).toString('hex'), Buffer.from(salt).toString('hex')]) {
    assert.equal(publicData.includes(raw), false, 'private fixture leaked into public runtime data');
  }
});

test('submission transcript inserts its commitment but cannot replay after it is spent', () => {
  const open = call(tender(), 'openTender');
  const submitted = call(open, 'submitPrivateBidConcept');
  const transcript = { gas: 1000000000n, effects: submitted.result.context.transactionContext.effects, program: submitted.result.proofData.publicTranscript };
  const replay = new runtime.QueryContext(open.currentContractState.data, runtime.dummyContractAddress());
  replay.block = { secondsSinceEpoch: 900n, secondsSinceEpochErr: 0, blockHash: '00'.repeat(32) };
  const applied = replay.runTranscript(transcript, runtime.CostModel.dummyCostModel());
  assert.equal(ledger(applied.state).submissionCount, 1n);
  assert.deepEqual([...ledger(applied.state).bidCommitments], [...ledger(submitted.currentContractState.data).bidCommitments]);
  assert.throws(() => applied.runTranscript(transcript, runtime.CostModel.dummyCostModel()));
});

test('rejected bids leave both nullifier map and participation count unchanged', () => {
  const submitted = call(call(tender(), 'openTender'), 'submitPrivateBidConcept');
  const original = [...ledger(submitted.currentContractState.data).bidCommitments];
  for (const overrides of [{ vendor: stranger, amount: 0n }, { vendor: stranger, eligible: false }, { amount: 99n }]) {
    assert.throws(() => call(submitted, 'submitPrivateBidConcept', 900n, overrides));
    assert.equal(ledger(submitted.currentContractState.data).submissionCount, 1n);
    assert.deepEqual([...ledger(submitted.currentContractState.data).bidCommitments], original);
  }
});
