import { clamp, lerp } from '../math/numerics.js';
import { colorForMetric } from './colorMap.js';

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fract(value) {
  return value - Math.floor(value);
}

export function radicalInverse(index, base) {
  let value = 0;
  let inverseBase = 1 / base;
  let fraction = inverseBase;
  let current = Math.max(Math.floor(index), 0);

  while (current > 0) {
    value += (current % base) * fraction;
    current = Math.floor(current / base);
    fraction *= inverseBase;
  }

  return value;
}

function findIndexInCdf(cdf, target) {
  let low = 0;
  let high = cdf.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (target <= cdf[middle]) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
}

function unpackGridIndex(flatIndex, resolution) {
  const xy = resolution * resolution;
  const zIndex = Math.floor(flatIndex / xy);
  const remainder = flatIndex - (zIndex * xy);
  const yIndex = Math.floor(remainder / resolution);
  const xIndex = remainder % resolution;
  return { xIndex, yIndex, zIndex };
}

export class CloudSampler {
  constructor({ bounds, step, resolution, view, weights, colorMetric, recommendedFloor = 0 }) {
    this.bounds = bounds;
    this.step = step;
    this.resolution = resolution;
    this.view = view;
    this.weights = weights;
    this.colorMetric = colorMetric;
    this.recommendedFloor = recommendedFloor;
    this.cdf = new Float64Array(weights.length);

    let cumulativeWeight = 0;
    let maximumWeight = 0;
    for (let index = 0; index < weights.length; index += 1) {
      const weight = weights[index] >= recommendedFloor ? weights[index] : 0;
      cumulativeWeight += weight;
      maximumWeight = Math.max(maximumWeight, weight);
      this.cdf[index] = cumulativeWeight;
    }

    this.totalWeight = cumulativeWeight;
    this.maximumWeight = Math.max(maximumWeight, 1e-12);
  }

  static fromPayload(payload) {
    return new CloudSampler({
      bounds: payload.bounds,
      step: payload.step,
      resolution: payload.resolution,
      view: payload.view,
      weights: payload.weightField instanceof Float32Array
        ? payload.weightField
        : new Float32Array(payload.weightField),
      colorMetric: payload.colorMetricField instanceof Float32Array
        ? payload.colorMetricField
        : new Float32Array(payload.colorMetricField),
      recommendedFloor: payload.stats?.recommendedFloor ?? 0
    });
  }

  sample({ count = 18000, pointSize = 4.2, jitter = 1, seed = 1, phaseOffset = 0 } = {}) {
    const rng = mulberry32(seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);

    if (this.totalWeight <= 0) {
      return { positions, colors, alphas, sizes, count: 0 };
    }

    const rotation = fract((0.7548776662466927 * (seed + 1)) + phaseOffset);
    const jitterRotation = fract((0.5698402909980532 * (seed + 1)) + (phaseOffset * 0.73));
    const pointScaleBias = this.view === 'reactive-flow' || this.view === 'delta-density' ? 1.42 : 1.28;
    const alphaCeiling = this.view === 'reactive-channel' || this.view === 'valence-density' || this.view === 'total-density' ? 0.48 : 0.40;

    for (let pointIndex = 0; pointIndex < count; pointIndex += 1) {
      const intraStratum = radicalInverse(pointIndex + seed + 1, 2);
      const targetUnit = fract((((pointIndex + intraStratum) / count) + rotation));
      const target = Math.max(targetUnit * this.totalWeight, Number.EPSILON);
      const flatIndex = findIndexInCdf(this.cdf, target);
      const { xIndex, yIndex, zIndex } = unpackGridIndex(flatIndex, this.resolution);
      const metric = this.colorMetric[flatIndex];
      const weight = this.weights[flatIndex];
      const weightFraction = clamp(weight / this.maximumWeight, 0, 1);
      const magnitude = this.view === 'reactive-donor'
        || this.view === 'reactive-acceptor'
        || this.view === 'reactive-flow'
        || this.view === 'homo-probability'
        || this.view === 'lumo-probability'
        || this.view === 'delta-density'
        ? Math.abs(metric)
        : weightFraction;

      const jitterX = (fract(radicalInverse(pointIndex + seed + 1, 3) + jitterRotation) - 0.5) * this.step.x * jitter;
      const jitterY = (fract(radicalInverse(pointIndex + seed + 1, 5) + (jitterRotation * 1.37)) - 0.5) * this.step.y * jitter;
      const jitterZ = (fract(radicalInverse(pointIndex + seed + 1, 7) + (jitterRotation * 1.91)) - 0.5) * this.step.z * jitter;

      const x = this.bounds.minX + (this.step.x * xIndex) + jitterX;
      const y = this.bounds.minY + (this.step.y * yIndex) + jitterY;
      const z = this.bounds.minZ + (this.step.z * zIndex) + jitterZ;

      const color = colorForMetric(metric, this.view);
      const alpha = lerp(0.045, alphaCeiling, magnitude ** 0.45);
      const size = pointSize * lerp(0.72, pointScaleBias, weightFraction ** 0.33);

      const offset = pointIndex * 3;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      colors[offset] = color[0];
      colors[offset + 1] = color[1];
      colors[offset + 2] = color[2];
      alphas[pointIndex] = alpha;
      sizes[pointIndex] = size;
    }

    return {
      positions,
      colors,
      alphas,
      sizes,
      count
    };
  }
}

export function unpackGridIndexForTest(flatIndex, resolution) {
  return unpackGridIndex(flatIndex, resolution);
}
