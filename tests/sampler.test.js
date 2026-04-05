import test from 'node:test';
import assert from 'node:assert/strict';

import { getReactionGeometry, computeBounds } from '../src/chemistry/reactionPath.js';
import { computeReactionSnapshot, sampleFieldOnGrid } from '../src/physics/sampler.js';

test('coarse grid integral tracks the 22 valence electrons within a reasonable sampling tolerance', () => {
  const geometry = getReactionGeometry(0.5);
  const model = computeReactionSnapshot(geometry);
  const sampled = sampleFieldOnGrid({
    currentModel: model,
    atoms: geometry.atoms,
    bounds: computeBounds(geometry.atoms, 2.6),
    resolution: 20,
    view: 'valence-density'
  });

  assert.ok(Math.abs(sampled.stats.integral - 22) < 1.2, `integral = ${sampled.stats.integral}`);
});

test('delta density integrates to approximately zero because electrons are redistributed, not created', () => {
  const geometry = getReactionGeometry(0.75);
  const currentModel = computeReactionSnapshot(geometry);
  const referenceModel = computeReactionSnapshot(getReactionGeometry(0));
  const sampled = sampleFieldOnGrid({
    currentModel,
    referenceModel,
    atoms: geometry.atoms,
    bounds: computeBounds(geometry.atoms, 2.6),
    resolution: 20,
    view: 'delta-density'
  });

  assert.ok(Math.abs(sampled.stats.integral) < 0.65, `delta integral = ${sampled.stats.integral}`);
});
