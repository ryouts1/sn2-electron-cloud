import test from 'node:test';
import assert from 'node:assert/strict';

import { getReactionGeometry } from '../src/chemistry/reactionPath.js';

test('reaction path starts with long O···C and short C–Cl, then swaps by the product side', () => {
  const reactant = getReactionGeometry(0);
  const product = getReactionGeometry(1);

  assert.ok(Math.abs(reactant.metrics.oCDistance - 3.2) < 1e-9);
  assert.ok(Math.abs(reactant.metrics.cClDistance - 1.78) < 1e-9);
  assert.ok(Math.abs(product.metrics.oCDistance - 1.43) < 1e-9);
  assert.ok(Math.abs(product.metrics.cClDistance - 3.85) < 1e-9);
});

test('reaction path passes through a symmetric SN2-like transition geometry', () => {
  const transition = getReactionGeometry(0.5);

  assert.ok(Math.abs(transition.metrics.oCDistance - transition.metrics.cClDistance) < 1e-9);
  assert.ok(Math.abs(transition.metrics.carbonInversionX) < 1e-9);
});

test('methyl inversion changes sign across the reaction coordinate', () => {
  const reactant = getReactionGeometry(0);
  const product = getReactionGeometry(1);

  assert.ok(reactant.metrics.carbonInversionX < 0);
  assert.ok(product.metrics.carbonInversionX > 0);
});
