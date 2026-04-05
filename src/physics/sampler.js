import { computeBounds } from '../chemistry/reactionPath.js';
import { ELEMENTS } from '../chemistry/elements.js';
import {
  evaluateDensityAtPoint,
  evaluateDeltaDensityAtPoint,
  evaluateOrbitalAmplitude,
  solveExtendedHuckel
} from './extendedHuckel.js';
import { percentile } from '../math/numerics.js';

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

function sampleValueAtPoint({ currentModel, referenceModel, atoms, point, view }) {
  switch (view) {
    case 'valence-density':
      return evaluateDensityAtPoint(currentModel, point);
    case 'total-density':
      return evaluateDensityAtPoint(currentModel, point) + evaluatePseudoCoreDensity(atoms, point);
    case 'delta-density':
      return evaluateDeltaDensityAtPoint(currentModel, referenceModel, point);
    case 'homo-phase':
      return evaluateOrbitalAmplitude(currentModel, point, currentModel.homoIndex);
    case 'lumo-phase':
      return evaluateOrbitalAmplitude(currentModel, point, currentModel.lumoIndex);
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
  const positiveField = new Float32Array(gridSize);
  const negativeField = new Float32Array(gridSize);
  const values = [];
  const positiveValues = [];
  const absoluteValues = [];

  const stepX = (bounds.maxX - bounds.minX) / (resolution - 1);
  const stepY = (bounds.maxY - bounds.minY) / (resolution - 1);
  const stepZ = (bounds.maxZ - bounds.minZ) / (resolution - 1);
  const cellVolume = stepX * stepY * stepZ;

  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let integral = 0;

  let index = 0;
  for (let zIndex = 0; zIndex < resolution; zIndex += 1) {
    const z = bounds.minZ + (stepZ * zIndex);
    for (let yIndex = 0; yIndex < resolution; yIndex += 1) {
      const y = bounds.minY + (stepY * yIndex);
      for (let xIndex = 0; xIndex < resolution; xIndex += 1) {
        const x = bounds.minX + (stepX * xIndex);
        const value = sampleValueAtPoint({
          currentModel,
          referenceModel,
          atoms,
          point: { x, y, z },
          view
        });

        rawField[index] = value;
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
        integral += value * cellVolume;
        values.push(value);

        if (view === 'delta-density' || view === 'homo-phase' || view === 'lumo-phase') {
          const positive = Math.max(value, 0);
          const negative = Math.max(-value, 0);
          positiveField[index] = positive;
          negativeField[index] = negative;
          if (positive > 0) {
            positiveValues.push(positive);
          }
          if (negative > 0) {
            positiveValues.push(negative);
          }
          if (value !== 0) {
            absoluteValues.push(Math.abs(value));
          }
        } else {
          const clipped = Math.max(value, 0);
          positiveField[index] = clipped;
          if (clipped > 0) {
            positiveValues.push(clipped);
          }
        }

        index += 1;
      }
    }
  }

  const signedMode = view === 'delta-density' || view === 'homo-phase' || view === 'lumo-phase';
  const maximumMagnitude = signedMode
    ? Math.max(Math.abs(minimum), Math.abs(maximum), 1e-12)
    : Math.max(maximum, 1e-12);
  const scale = 100 / maximumMagnitude;

  for (let fieldIndex = 0; fieldIndex < gridSize; fieldIndex += 1) {
    if (signedMode) {
      positiveField[fieldIndex] *= scale;
      negativeField[fieldIndex] *= scale;
    } else {
      positiveField[fieldIndex] *= scale;
    }
  }

  const quantiles = buildQuantileSummary(signedMode ? absoluteValues : positiveValues, false);
  const suggestedIsoRaw = Math.max(quantiles.q95, quantiles.median * 1.2, maximumMagnitude * 0.08);
  const suggestedIsoScaled = Math.max(Math.min(suggestedIsoRaw * scale, 95), 3);

  return {
    bounds,
    resolution,
    step: { x: stepX, y: stepY, z: stepZ },
    rawField,
    positiveField,
    negativeField,
    stats: {
      minimum,
      maximum,
      maximumMagnitude,
      scale,
      integral,
      suggestedIsoScaled,
      quantiles
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
