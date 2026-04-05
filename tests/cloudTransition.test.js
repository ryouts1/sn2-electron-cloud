import test from 'node:test';
import assert from 'node:assert/strict';

import { areCloudsCompatible, blendClouds, cloneCloud, createCloudBuffer } from '../src/render/cloudTransition.js';

function assertArraysClose(actual, expected, tolerance = 1e-6) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) <= tolerance, `index ${index}: ${actual[index]} vs ${expected[index]}`);
  }
}

test('createCloudBuffer allocates typed arrays for the requested point count', () => {
  const buffer = createCloudBuffer(3);
  assert.equal(buffer.positions.length, 9);
  assert.equal(buffer.colors.length, 9);
  assert.equal(buffer.alphas.length, 3);
  assert.equal(buffer.sizes.length, 3);
  assert.equal(buffer.count, 3);
});

test('blendClouds linearly interpolates between compatible clouds', () => {
  const from = {
    positions: new Float32Array([0, 0, 0, 2, 2, 2]),
    colors: new Float32Array([0, 0, 0, 1, 1, 1]),
    alphas: new Float32Array([0.1, 0.2]),
    sizes: new Float32Array([2, 4]),
    count: 2
  };
  const to = {
    positions: new Float32Array([2, 2, 2, 4, 4, 4]),
    colors: new Float32Array([1, 1, 1, 0, 0, 0]),
    alphas: new Float32Array([0.5, 0.6]),
    sizes: new Float32Array([6, 8]),
    count: 2
  };

  assert.ok(areCloudsCompatible(from, to));
  const blended = blendClouds(from, to, 0.5);
  assertArraysClose(Array.from(blended.positions), [1, 1, 1, 3, 3, 3]);
  assertArraysClose(Array.from(blended.colors), [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  assertArraysClose(Array.from(blended.alphas), [0.3, 0.4]);
  assertArraysClose(Array.from(blended.sizes), [4, 6]);
});

test('cloneCloud returns deep copies of the arrays', () => {
  const source = {
    positions: new Float32Array([1, 2, 3]),
    colors: new Float32Array([0.1, 0.2, 0.3]),
    alphas: new Float32Array([0.4]),
    sizes: new Float32Array([5]),
    count: 1
  };

  const cloned = cloneCloud(source);
  source.positions[0] = 99;
  source.colors[0] = 99;
  source.alphas[0] = 99;
  source.sizes[0] = 99;

  assertArraysClose(Array.from(cloned.positions), [1, 2, 3]);
  assertArraysClose(Array.from(cloned.colors), [0.1, 0.2, 0.3]);
  assertArraysClose(Array.from(cloned.alphas), [0.4]);
  assertArraysClose(Array.from(cloned.sizes), [5]);
});
