import test from 'node:test';
import assert from 'node:assert/strict';

import { CloudSampler, mulberry32, radicalInverse, unpackGridIndexForTest } from '../src/render/cloudSampler.js';

test('mulberry32 is deterministic for a fixed seed', () => {
  const left = mulberry32(12345);
  const right = mulberry32(12345);

  const samplesLeft = Array.from({ length: 5 }, () => left());
  const samplesRight = Array.from({ length: 5 }, () => right());
  assert.deepEqual(samplesLeft, samplesRight);
});

test('radical inverse generates the expected low-discrepancy digits', () => {
  assert.equal(radicalInverse(1, 2), 0.5);
  assert.equal(radicalInverse(2, 2), 0.25);
  assert.equal(radicalInverse(3, 2), 0.75);
  assert.equal(radicalInverse(1, 3), 1 / 3);
});

test('CloudSampler samples points inside the stated bounds', () => {
  const sampler = new CloudSampler({
    bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: -1, maxZ: 1 },
    step: { x: 1, y: 1, z: 1 },
    resolution: 2,
    view: 'homo-probability',
    weights: new Float32Array([1, 0, 0, 0, 0, 0, 0, 0]),
    colorMetric: new Float32Array([1, 0, 0, 0, 0, 0, 0, 0])
  });

  const cloud = sampler.sample({ count: 32, pointSize: 4, seed: 99, phaseOffset: 0.15 });
  assert.equal(cloud.count, 32);

  for (let index = 0; index < cloud.positions.length; index += 3) {
    assert.ok(cloud.positions[index] >= -1.5 && cloud.positions[index] <= -0.5);
    assert.ok(cloud.positions[index + 1] >= -1.5 && cloud.positions[index + 1] <= -0.5);
    assert.ok(cloud.positions[index + 2] >= -1.5 && cloud.positions[index + 2] <= -0.5);
  }
});

test('grid index unpacking maps flat indices back to x/y/z indices', () => {
  assert.deepEqual(unpackGridIndexForTest(0, 4), { xIndex: 0, yIndex: 0, zIndex: 0 });
  assert.deepEqual(unpackGridIndexForTest(5, 4), { xIndex: 1, yIndex: 1, zIndex: 0 });
  assert.deepEqual(unpackGridIndexForTest(42, 4), { xIndex: 2, yIndex: 2, zIndex: 2 });
});
