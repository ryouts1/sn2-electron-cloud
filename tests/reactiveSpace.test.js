import test from 'node:test';
import assert from 'node:assert/strict';

import { getReactionGeometry, computeBounds } from '../src/chemistry/reactionPath.js';
import { solveExtendedHuckel } from '../src/physics/extendedHuckel.js';
import { sampleFieldOnGrid } from '../src/physics/sampler.js';
import { reactiveBasisWeightsForTest } from '../src/physics/reactiveSpace.js';

const EXPECTED_INDICES = {
  0: { donor: 8, acceptor: 11 },
  0.5: { donor: 6, acceptor: 11 },
  1: { donor: 5, acceptor: 11 }
};

for (const progress of [0, 0.5, 1]) {
  test(`reactive orbital selector tracks the SN2 donor/acceptor pair at progress ${progress}`, () => {
    const model = solveExtendedHuckel(getReactionGeometry(progress).atoms);
    assert.equal(model.reactiveOrbitals.donorIndex, EXPECTED_INDICES[progress].donor);
    assert.equal(model.reactiveOrbitals.acceptorIndex, EXPECTED_INDICES[progress].acceptor);
    assert.ok(model.reactiveOrbitals.donorNorm > 0.2);
    assert.ok(model.reactiveOrbitals.acceptorNorm > 0.9 || progress === 1);
  });
}

test('reactive projector ignores hydrogen spectator basis functions', () => {
  const model = solveExtendedHuckel(getReactionGeometry(0.5).atoms);
  const donorWeights = reactiveBasisWeightsForTest(model, 'donor');
  const channelWeights = reactiveBasisWeightsForTest(model, 'channel');

  model.basisFunctions.forEach((basisFunction, basisIndex) => {
    if (basisFunction.element === 'H') {
      assert.equal(donorWeights[basisIndex], 0);
      assert.equal(channelWeights[basisIndex], 0);
    }
  });
});

test('reactive donor and acceptor probability clouds are normalized over the sampled box', () => {
  const geometry = getReactionGeometry(0.5);
  const model = solveExtendedHuckel(geometry.atoms);
  const bounds = computeBounds(geometry.atoms, 2.8);

  const donor = sampleFieldOnGrid({
    currentModel: model,
    atoms: geometry.atoms,
    bounds,
    resolution: 26,
    view: 'reactive-donor'
  });
  const acceptor = sampleFieldOnGrid({
    currentModel: model,
    atoms: geometry.atoms,
    bounds,
    resolution: 26,
    view: 'reactive-acceptor'
  });

  assert.ok(Math.abs(donor.stats.integral - 1) < 0.25, `donor integral = ${donor.stats.integral}`);
  assert.ok(Math.abs(acceptor.stats.integral - 1) < 0.25, `acceptor integral = ${acceptor.stats.integral}`);
});

test('reactive channel density keeps only a small subset of the total valence electrons', () => {
  const geometry = getReactionGeometry(0.5);
  const model = solveExtendedHuckel(geometry.atoms);
  const sampled = sampleFieldOnGrid({
    currentModel: model,
    atoms: geometry.atoms,
    bounds: computeBounds(geometry.atoms, 2.8),
    resolution: 24,
    view: 'reactive-channel'
  });

  assert.ok(sampled.stats.integral > 3.5, `reactive integral = ${sampled.stats.integral}`);
  assert.ok(sampled.stats.integral < 6.5, `reactive integral = ${sampled.stats.integral}`);
});
