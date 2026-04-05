import test from 'node:test';
import assert from 'node:assert/strict';

import { getCurrentStage, getEnergy, getReactionState } from '../src/model/reactionModel.js';

test('reactant side starts with intact C-Br bond and no C-O bond', () => {
  const state = getReactionState(0);

  assert.equal(state.stage.key, 'reactant');
  assert.ok(state.metrics.ocBondOrder < 0.05);
  assert.ok(state.metrics.cbrBondOrder > 0.95);
});

test('transition state shows partial bonds on both sides', () => {
  const state = getReactionState(0.5);

  assert.equal(state.stage.key, 'transition');
  assert.ok(Math.abs(state.metrics.ocBondOrder - 0.5) < 0.08);
  assert.ok(Math.abs(state.metrics.cbrBondOrder - 0.5) < 0.08);
});

test('product side ends with strong C-O bond and bromide departure', () => {
  const state = getReactionState(1);

  assert.equal(state.stage.key, 'product');
  assert.ok(state.metrics.ocBondOrder > 0.95);
  assert.ok(state.metrics.cbrBondOrder < 0.05);

  const bromine = state.atoms.find((atom) => atom.id === 'bromine');
  assert.ok(bromine.x > 620);
});

test('energy barrier peaks near the middle of the reaction coordinate', () => {
  const start = getEnergy(0);
  const middle = getEnergy(0.5);
  const end = getEnergy(1);

  assert.ok(middle > start);
  assert.ok(middle > end);
});

test('stage boundaries are stable at representative points', () => {
  assert.equal(getCurrentStage(0.3).key, 'approach');
  assert.equal(getCurrentStage(0.55).key, 'transition');
  assert.equal(getCurrentStage(0.7).key, 'departure');
});
