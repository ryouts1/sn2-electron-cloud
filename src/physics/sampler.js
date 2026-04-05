import { computeBounds } from '../chemistry/reactionPath.js';
import { ELEMENTS } from '../chemistry/elements.js';
import {
  evaluateDensityAtPoint,
  evaluateDeltaDensityAtPoint,
  evaluateOrbitalAmplitude,
  solveExtendedHuckel
} from './extendedHuckel.js';
import {
  evaluateReactiveAcceptorAmplitude,
  evaluateReactiveChannelDensityAtPoint,
  evaluateReactiveDonorAmplitude,
  evaluateReactiveFlowAtPoint
} from './reactiveSpace.js';
import { clamp, percentile } from '../math/numerics.js';

function gaussianCoreDensity(shell, radiusSquared) {
  const normalization = (shell.exponent / Math.PI) ** 1.5;
  return shell.electrons * normalization * Math.exp(-shell.exponent * radiusSquared);
}

export function evaluatePseudoCoreDensity(atoms, point) {
  let density = 0;

  for (const atom of atoms) {
    const element = ELEMENTS[atom.element];
    if (!element?.coreDensity?.length) {
      continue;
    }

    const dx = point.x - atom.x;
    const dy = point.y - atom.y;
    const dz = point.z - atom.z;
    const radiusSquared = (dx * dx) + (dy * dy) + (dz * dz);

    for (const shell of element.coreDensity) {
      density += gaussianCoreDensity(shell, radiusSquared);
    }
  }

  return density;
}

function sampleDescriptorAtPoint({ currentModel, referenceModel, atoms, point, view }) {
  switch (view) {
    case 'reactive-channel': {
      const density = evaluateReactiveChannelDensityAtPoint(currentModel, point);
      return {
        rawValue: density,
        weightValue: Math.max(density, 0),
        integralValue: density,
        signedMode: false
      };
    }
    case 'reactive-flow': {
      const delta = evaluateReactiveFlowAtPoint(currentModel, referenceModel, point);
      return {
        rawValue: delta,
        weightValue: Math.abs(delta),
        integralValue: delta,
        signedMode: true
      };
    }
    case 'reactive-donor': {
      const amplitude = evaluateReactiveDonorAmplitude(currentModel, point);
      return {
        rawValue: amplitude,
        weightValue: amplitude * amplitude,
        integralValue: amplitude * amplitude,
        signedMode: true
      };
    }
    case 'reactive-acceptor': {
      const amplitude = evaluateReactiveAcceptorAmplitude(currentModel, point);
      return {
        rawValue: amplitude,
        weightValue: amplitude * amplitude,
        integralValue: amplitude * amplitude,
        signedMode: true
      };
    }
    case 'valence-density': {
      const density = evaluateDensityAtPoint(currentModel, point);
      return {
        rawValue: density,
        weightValue: Math.max(density, 0),
        integralValue: density,
        signedMode: false
      };
    }
    case 'total-density': {
      const density = evaluateDensityAtPoint(currentModel, point) + evaluatePseudoCoreDensity(atoms, point);
      return {
        rawValue: density,
        weightValue: Math.max(density, 0),
        integralValue: density,
        signedMode: false
      };
    }
    case 'delta-density': {
      const delta = evaluateDeltaDensityAtPoint(currentModel, referenceModel, point);
      return {
        rawValue: delta,
        weightValue: Math.abs(delta),
        integralValue: delta,
        signedMode: true
      };
    }
    case 'homo-probability': {
      const amplitude = evaluateOrbitalAmplitude(currentModel, point, currentModel.homoIndex);
      return {
        rawValue: amplitude,
        weightValue: amplitude * amplitude,
        integralValue: amplitude * amplitude,
        signedMode: true
      };
    }
    case 'lumo-probability': {
      const amplitude = evaluateOrbitalAmplitude(currentModel, point, currentModel.lumoIndex);
      return {
        rawValue: amplitude,
        weightValue: amplitude * amplitude,
        integralValue: amplitude * amplitude,
        signedMode: true
      };
    }
    default:
      throw new Error(`Unsupported view: ${view}`);
  }
}

export function buildQuantileSummary(values, signed = false) {
  if (!values.length) {
    return {
      median: 0,
      q90: 0,
      q95: 0,
      q98: 0
    };
  }

  const source = signed ? values.map((value) => Math.abs(value)) : values;
  return {
    median: percentile(source, 0.5),
    q90: percentile(source, 0.9),
    q95: percentile(source, 0.95),
    q98: percentile(source, 0.98)
  };
}

export function sampleFieldOnGrid({
  currentModel,
  referenceModel = null,
  atoms,
  bounds = computeBounds(atoms, 2.4),
  resolution = 34,
  view = 'valence-density'
}) {
  const gridSize = resolution ** 3;
  const rawField = new Float32Array(gridSize);
  const weightField = new Float32Array(gridSize);
  const colorMetricField = new Float32Array(gridSize);
  const weightValues = [];
  const magnitudeValues = [];

  const stepX = (bounds.maxX - bounds.minX) / (resolution - 1);
  const stepY = (bounds.maxY - bounds.minY) / (resolution - 1);
  const stepZ = (bounds.maxZ - bounds.minZ) / (resolution - 1);
  const cellVolume = stepX * stepY * stepZ;

  let minimumRaw = Number.POSITIVE_INFINITY;
  let maximumRaw = Number.NEGATIVE_INFINITY;
  let maximumMagnitude = 0;
  let maximumWeight = 0;
  let integral = 0;
  let totalWeight = 0;
  let signedMode = false;

  let index = 0;
  for (let zIndex = 0; zIndex < resolution; zIndex += 1) {
    const z = bounds.minZ + (stepZ * zIndex);
    for (let yIndex = 0; yIndex < resolution; yIndex += 1) {
      const y = bounds.minY + (stepY * yIndex);
      for (let xIndex = 0; xIndex < resolution; xIndex += 1) {
        const x = bounds.minX + (stepX * xIndex);
        const descriptor = sampleDescriptorAtPoint({
          currentModel,
          referenceModel,
          atoms,
          point: { x, y, z },
          view
        });

        signedMode = descriptor.signedMode;
        rawField[index] = descriptor.rawValue;
        weightField[index] = descriptor.weightValue;
        integral += descriptor.integralValue * cellVolume;
        totalWeight += descriptor.weightValue;
        minimumRaw = Math.min(minimumRaw, descriptor.rawValue);
        maximumRaw = Math.max(maximumRaw, descriptor.rawValue);
        maximumMagnitude = Math.max(maximumMagnitude, Math.abs(descriptor.rawValue));
        maximumWeight = Math.max(maximumWeight, descriptor.weightValue);

        if (descriptor.weightValue > 0) {
          weightValues.push(descriptor.weightValue);
          magnitudeValues.push(Math.abs(descriptor.rawValue));
        }

        index += 1;
      }
    }
  }

  const quantiles = buildQuantileSummary(weightValues, false);
  const magnitudeQuantiles = buildQuantileSummary(magnitudeValues, false);
  const metricScale = signedMode
    ? Math.max(magnitudeQuantiles.q98, maximumMagnitude * 0.08, 1e-12)
    : Math.max(quantiles.q98, maximumWeight * 0.08, 1e-12);

  for (let fieldIndex = 0; fieldIndex < gridSize; fieldIndex += 1) {
    if (signedMode) {
      colorMetricField[fieldIndex] = clamp(rawField[fieldIndex] / metricScale, -1, 1);
    } else {
      colorMetricField[fieldIndex] = clamp(weightField[fieldIndex] / metricScale, 0, 1);
    }
  }

  return {
    bounds,
    resolution,
    step: { x: stepX, y: stepY, z: stepZ },
    rawField,
    weightField,
    colorMetricField,
    stats: {
      minimumRaw,
      maximumRaw,
      maximumMagnitude,
      maximumWeight,
      totalWeight,
      integral,
      quantiles,
      signedMode,
      recommendedFloor: Math.max(quantiles.q90 * 0.03, quantiles.median * 0.25, maximumWeight * 1e-6),
      colorScale: metricScale,
      colorScaleSource: signedMode ? 'magnitude q98' : 'weight q98',
      magnitudeQuantiles
    }
  };
}

export function computeReactionSnapshot(geometry, options = {}) {
  const currentModel = solveExtendedHuckel(geometry.atoms, {
    basisScale: options.basisScale ?? 1,
    couplingScale: options.couplingScale ?? 1.75
  });

  return currentModel;
}
