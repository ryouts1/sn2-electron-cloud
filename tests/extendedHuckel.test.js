import test from 'node:test';
import assert from 'node:assert/strict';

import { getReactionGeometry } from '../src/chemistry/reactionPath.js';
import { solveExtendedHuckel, evaluateDensityAtPoint } from '../src/physics/extendedHuckel.js';

for (const progress of [0, 0.5, 1]) {
  test(`electron count is preserved at progress ${progress}`, () => {
    const geometry = getReactionGeometry(progress);
    const model = solveExtendedHuckel(geometry.atoms);
    assert.ok(Math.abs(model.electronCountCheck - 22) < 1e-8);

    const totalCharge = Object.values(model.charges).reduce((sum, charge) => sum + charge, 0);
    assert.ok(Math.abs(totalCharge + 1) < 1e-8);
  });
}

test('O-C bond population grows while C-Cl bond population collapses along the SN2 path', () => {
  const reactantModel = solveExtendedHuckel(getReactionGeometry(0).atoms);
  const transitionModel = solveExtendedHuckel(getReactionGeometry(0.5).atoms);
  const productModel = solveExtendedHuckel(getReactionGeometry(1).atoms);

  assert.ok(reactantModel.overlapPopulations.O_C < transitionModel.overlapPopulations.O_C);
  assert.ok(transitionModel.overlapPopulations.O_C < productModel.overlapPopulations.O_C);
  assert.ok(reactantModel.overlapPopulations.C_Cl > transitionModel.overlapPopulations.C_Cl);
  assert.ok(transitionModel.overlapPopulations.C_Cl > productModel.overlapPopulations.C_Cl);
});

test('density evaluated from the density matrix stays non-negative at sampled points', () => {
  const model = solveExtendedHuckel(getReactionGeometry(0.5).atoms);
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: -2, y: 0, z: 0 },
    { x: 2, y: 0.3, z: -0.4 },
    { x: 0.2, y: 1.1, z: 0.7 }
  ];

  for (const point of points) {
    const density = evaluateDensityAtPoint(model, point);
    assert.ok(density >= -1e-10, `density(${JSON.stringify(point)}) = ${density}`);
  }
});
