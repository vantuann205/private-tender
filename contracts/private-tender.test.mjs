import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import * as runtime from '@midnight-ntwrk/compact-runtime';

const { Contract, ledger, TenderStatus } = createRequire(import.meta.url)('../.compact-generated/private-tender/contract/index.cjs');
const owner = new Uint8Array(32).fill(1);
const stranger = new Uint8Array(32).fill(2);
const contract = new Contract({
  ownerSecret: ({ privateState }) => [privateState, privateState.secret],
  meetsRequirements: ({ privateState }) => [privateState, privateState.eligible],
  privateBidAmount: ({ privateState }) => [privateState, privateState.amount],
});

function tender(deadline = 1000n) {
  return contract.initialState(runtime.constructorContext({ secret: owner, eligible: true, amount: 50n }, '00'.repeat(32)), deadline, new Uint8Array(32));
}

function call(state, circuit, time = 900n, overrides = {}, uncertainty = 0) {
  const transactionContext = new runtime.QueryContext(state.currentContractState.data, runtime.dummyContractAddress());
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
