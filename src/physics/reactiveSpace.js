import { evaluateBasisVector } from './gaussianBasis.js';

const OCCUPIED_ENERGY_SIGMA_EV = 3.2;
const VIRTUAL_ENERGY_SIGMA_EV = 4.2;

const REACTIVE_WEIGHT_SCHEMES = {
  donor: {
    O_s: 0.55,
    O_px: 1.0,
    C_s: 0.12,
    C_px: 0.25
  },
  acceptor: {
    O_px: 0.15,
    C_s: 0.70,
    C_px: 1.0,
    Cl_s: 0.45,
    Cl_px: 1.0
  },
  channel: {
    O_s: 0.45,
    O_px: 1.0,
    C_s: 0.65,
    C_px: 1.0,
    Cl_s: 0.35,
    Cl_px: 1.0
  }
};

function basisKey(basisFunction) {
  return `${basisFunction.atomId}_${basisFunction.orbitalType}`;
}

function buildWeightVector(basisFunctions, schemeName) {
  const scheme = REACTIVE_WEIGHT_SCHEMES[schemeName];
  if (!scheme) {
    throw new Error(`Unknown reactive scheme: ${schemeName}`);
  }

  return basisFunctions.map((basisFunction) => scheme[basisKey(basisFunction)] ?? 0);
}

function gaussianEnergyWindow(energy, center, sigma) {
  const delta = energy - center;
  return Math.exp(-(delta * delta) / (2 * sigma * sigma));
}

export function projectedOrbitalNormFromWeights(model, orbitalIndex, weights) {
  const coefficients = model.coefficientMatrix.map((row) => row[orbitalIndex]);
  let norm = 0;

  for (let rowIndex = 0; rowIndex < weights.length; rowIndex += 1) {
    const leftWeight = weights[rowIndex];
    if (leftWeight === 0) {
      continue;
    }
    const leftValue = leftWeight * coefficients[rowIndex];

    for (let columnIndex = 0; columnIndex < weights.length; columnIndex += 1) {
      const rightWeight = weights[columnIndex];
      if (rightWeight === 0) {
        continue;
      }
      norm += leftValue * model.overlapMatrix[rowIndex][columnIndex] * (rightWeight * coefficients[columnIndex]);
    }
  }

  return Math.max(norm, 0);
}

function findBestOrbitalIndex({ model, orbitalIndices, weights, referenceEnergy, energySigma }) {
  let bestIndex = orbitalIndices[0] ?? 0;
  let bestScore = -Infinity;
  let bestNorm = 0;

  orbitalIndices.forEach((orbitalIndex) => {
    const projectedNorm = projectedOrbitalNormFromWeights(model, orbitalIndex, weights);
    const window = gaussianEnergyWindow(model.orbitalEnergies[orbitalIndex], referenceEnergy, energySigma);
    const score = projectedNorm * window;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = orbitalIndex;
      bestNorm = projectedNorm;
    }
  });

  return {
    index: bestIndex,
    score: Math.max(bestScore, 0),
    projectedNorm: bestNorm
  };
}

export function analyzeReactiveOrbitals(model) {
  const donorWeights = buildWeightVector(model.basisFunctions, 'donor');
  const acceptorWeights = buildWeightVector(model.basisFunctions, 'acceptor');
  const channelWeights = buildWeightVector(model.basisFunctions, 'channel');
  const occupiedIndices = model.occupancies
    .map((occupancy, orbitalIndex) => ({ occupancy, orbitalIndex }))
    .filter((entry) => entry.occupancy > 0)
    .map((entry) => entry.orbitalIndex);
  const virtualIndices = model.occupancies
    .map((occupancy, orbitalIndex) => ({ occupancy, orbitalIndex }))
    .filter((entry) => entry.occupancy === 0)
    .map((entry) => entry.orbitalIndex);

  const donor = findBestOrbitalIndex({
    model,
    orbitalIndices: occupiedIndices,
    weights: donorWeights,
    referenceEnergy: model.orbitalEnergies[model.homoIndex],
    energySigma: OCCUPIED_ENERGY_SIGMA_EV
  });

  const acceptor = findBestOrbitalIndex({
    model,
    orbitalIndices: virtualIndices,
    weights: acceptorWeights,
    referenceEnergy: model.orbitalEnergies[model.lumoIndex],
    energySigma: VIRTUAL_ENERGY_SIGMA_EV
  });

  const channelElectronCount = occupiedIndices.reduce((sum, orbitalIndex) => (
    sum + (model.occupancies[orbitalIndex] * projectedOrbitalNormFromWeights(model, orbitalIndex, channelWeights))
  ), 0);

  return {
    donorIndex: donor.index,
    donorScore: donor.score,
    donorNorm: donor.projectedNorm,
    donorEnergy: model.orbitalEnergies[donor.index],
    acceptorIndex: acceptor.index,
    acceptorScore: acceptor.score,
    acceptorNorm: acceptor.projectedNorm,
    acceptorEnergy: model.orbitalEnergies[acceptor.index],
    donorAcceptorGap: model.orbitalEnergies[acceptor.index] - model.orbitalEnergies[donor.index],
    channelElectronCount,
    donorWeights,
    acceptorWeights,
    channelWeights
  };
}

function evaluateWeightedAmplitude(model, point, orbitalIndex, weights, normalize = false, precomputedNorm = null) {
  const basisValues = evaluateBasisVector(model.basisFunctions, point);
  let amplitude = 0;

  for (let basisIndex = 0; basisIndex < basisValues.length; basisIndex += 1) {
    const weight = weights[basisIndex];
    if (weight === 0) {
      continue;
    }
    amplitude += weight * model.coefficientMatrix[basisIndex][orbitalIndex] * basisValues[basisIndex];
  }

  if (!normalize) {
    return amplitude;
  }

  const norm = Math.max(precomputedNorm ?? projectedOrbitalNormFromWeights(model, orbitalIndex, weights), 1e-12);
  return amplitude / Math.sqrt(norm);
}

export function evaluateReactiveDonorAmplitude(model, point) {
  const reactive = model.reactiveOrbitals;
  return evaluateWeightedAmplitude(
    model,
    point,
    reactive.donorIndex,
    reactive.donorWeights,
    true,
    reactive.donorNorm
  );
}

export function evaluateReactiveAcceptorAmplitude(model, point) {
  const reactive = model.reactiveOrbitals;
  return evaluateWeightedAmplitude(
    model,
    point,
    reactive.acceptorIndex,
    reactive.acceptorWeights,
    true,
    reactive.acceptorNorm
  );
}

export function evaluateReactiveChannelDensityAtPoint(model, point) {
  const { channelWeights } = model.reactiveOrbitals;
  const basisValues = evaluateBasisVector(model.basisFunctions, point);
  let density = 0;

  for (let orbitalIndex = 0; orbitalIndex < model.occupancies.length; orbitalIndex += 1) {
    const occupancy = model.occupancies[orbitalIndex];
    if (occupancy === 0) {
      continue;
    }

    let amplitude = 0;
    for (let basisIndex = 0; basisIndex < basisValues.length; basisIndex += 1) {
      const weight = channelWeights[basisIndex];
      if (weight === 0) {
        continue;
      }
      amplitude += weight * model.coefficientMatrix[basisIndex][orbitalIndex] * basisValues[basisIndex];
    }

    density += occupancy * amplitude * amplitude;
  }

  return Math.max(density, 0);
}

export function evaluateReactiveFlowAtPoint(currentModel, referenceModel, point) {
  return evaluateReactiveChannelDensityAtPoint(currentModel, point) - evaluateReactiveChannelDensityAtPoint(referenceModel, point);
}

export function reactiveBasisWeightsForTest(model, schemeName) {
  return buildWeightVector(model.basisFunctions, schemeName);
}
