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

function call(state, circuit, time = 900n, overrides = {}) {
  const transactionContext = new runtime.QueryContext(state.currentContractState.data, runtime.dummyContractAddress());
  transactionContext.block = { secondsSinceEpoch: time, secondsSinceEpochErr: 0, blockHash: '00'.repeat(32) };
  const result = contract.circuits[circuit]({
    originalState: state.currentContractState,
    currentPrivateState: { ...state.currentPrivateState, ...overrides },
    currentZswapLocalState: state.currentZswapLocalState,
    transactionContext,
  });
  const currentContractState = new runtime.ContractState();
  currentContractState.data = result.context.transactionContext.state;
  return { currentContractState, currentPrivateState: result.context.currentPrivateState, currentZswapLocalState: result.context.currentZswapLocalState };
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
