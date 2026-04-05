import test from 'node:test';
import assert from 'node:assert/strict';

import { getReactionGeometry } from '../src/chemistry/reactionPath.js';
import { buildValenceBasis, overlapIntegral } from '../src/physics/gaussianBasis.js';

test('buildValenceBasis creates the expected 16-function valence basis', () => {
  const geometry = getReactionGeometry(0);
  const basis = buildValenceBasis(geometry.atoms);
  assert.equal(basis.functions.length, 16);
  assert.equal(basis.electronCount, 22);
});

test('basis functions are normalized on their own center', () => {
  const geometry = getReactionGeometry(0.5);
  const basis = buildValenceBasis(geometry.atoms).functions;

  for (const basisFunction of basis) {
    const selfOverlap = overlapIntegral(basisFunction, basisFunction);
    assert.ok(Math.abs(selfOverlap - 1) < 1e-10, `${basisFunction.id} self-overlap = ${selfOverlap}`);
  }
});
