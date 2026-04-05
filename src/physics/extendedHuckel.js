import {
  multiplyMatrices,
  transpose,
  diagonalMatrix,
  jacobiEigenDecomposition,
  symmetricOrthogonalization,
  normalizeColumnSet,
  traceProduct
} from '../math/matrix.js';
import { buildValenceBasis, buildOverlapMatrix, evaluateBasisVector } from './gaussianBasis.js';

function buildHamiltonianMatrix(basisFunctions, overlapMatrix, couplingScale = 1.75) {
  const size = basisFunctions.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    for (let columnIndex = rowIndex; columnIndex < size; columnIndex += 1) {
      const left = basisFunctions[rowIndex];
      const right = basisFunctions[columnIndex];
      let value = 0;

      if (rowIndex === columnIndex) {
        value = left.onsiteEnergy;
      } else {
        const averageEnergy = 0.5 * (left.onsiteEnergy + right.onsiteEnergy);
        value = couplingScale * overlapMatrix[rowIndex][columnIndex] * averageEnergy;
      }

      matrix[rowIndex][columnIndex] = value;
      matrix[columnIndex][rowIndex] = value;
    }
  }

  return matrix;
}

function fillOccupancies(orbitalCount, electronCount) {
  const occupancies = Array(orbitalCount).fill(0);
  let remaining = electronCount;

  for (let index = 0; index < orbitalCount && remaining > 0; index += 1) {
    const occupancy = Math.min(2, remaining);
    occupancies[index] = occupancy;
    remaining -= occupancy;
  }

  return occupancies;
}

function buildDensityMatrix(coefficients, occupancies) {
  const orbitalCount = occupancies.length;
  const basisCount = coefficients.length;
  const matrix = Array.from({ length: basisCount }, () => Array(basisCount).fill(0));

  for (let orbitalIndex = 0; orbitalIndex < orbitalCount; orbitalIndex += 1) {
    const occupancy = occupancies[orbitalIndex];
    if (occupancy === 0) {
      continue;
    }
    for (let rowIndex = 0; rowIndex < basisCount; rowIndex += 1) {
      const rowCoefficient = coefficients[rowIndex][orbitalIndex];
      for (let columnIndex = 0; columnIndex < basisCount; columnIndex += 1) {
        matrix[rowIndex][columnIndex] += occupancy * rowCoefficient * coefficients[columnIndex][orbitalIndex];
      }
    }
  }

  return matrix;
}

function atomBasisIndexMap(basisFunctions) {
  return basisFunctions.reduce((map, basisFunction, basisIndex) => {
    map[basisFunction.atomId] ??= [];
    map[basisFunction.atomId].push(basisIndex);
    return map;
  }, {});
}

function computeMullikenCharges(basisFunctions, densityMatrix, overlapMatrix, atomValenceMap) {
  const basisByAtom = atomBasisIndexMap(basisFunctions);
  const populations = {};
  const charges = {};

  Object.entries(basisByAtom).forEach(([atomId, indices]) => {
    let population = 0;
    for (const rowIndex of indices) {
      for (let columnIndex = 0; columnIndex < basisFunctions.length; columnIndex += 1) {
        population += densityMatrix[rowIndex][columnIndex] * overlapMatrix[rowIndex][columnIndex];
      }
    }
    populations[atomId] = population;
    charges[atomId] = atomValenceMap[atomId] - population;
  });

  return { populations, charges, basisByAtom };
}

function computeBondOverlapPopulation(atomA, atomB, densityMatrix, overlapMatrix, basisByAtom) {
  let overlapPopulation = 0;
  for (const rowIndex of basisByAtom[atomA] ?? []) {
    for (const columnIndex of basisByAtom[atomB] ?? []) {
      overlapPopulation += densityMatrix[rowIndex][columnIndex] * overlapMatrix[rowIndex][columnIndex];
    }
  }
  return 2 * overlapPopulation;
}

function coefficientColumn(coefficients, columnIndex) {
  return coefficients.map((row) => row[columnIndex]);
}

export function solveExtendedHuckel(atoms, options = {}) {
  const basisScale = options.basisScale ?? 1;
  const couplingScale = options.couplingScale ?? 1.75;

  const basisModel = buildValenceBasis(atoms, basisScale);
  const basisFunctions = basisModel.functions;
  const overlapMatrix = buildOverlapMatrix(basisFunctions);
  const orthogonalizer = symmetricOrthogonalization(overlapMatrix);
  const hamiltonianMatrix = buildHamiltonianMatrix(basisFunctions, overlapMatrix, couplingScale);
  const transformedHamiltonian = multiplyMatrices(orthogonalizer, multiplyMatrices(hamiltonianMatrix, orthogonalizer));
  const decomposition = jacobiEigenDecomposition(transformedHamiltonian);
  const normalizedCoefficients = normalizeColumnSet(multiplyMatrices(orthogonalizer, decomposition.eigenvectors), overlapMatrix);
  const occupancies = fillOccupancies(basisFunctions.length, basisModel.electronCount);
  const densityMatrix = buildDensityMatrix(normalizedCoefficients, occupancies);
  const { populations, charges, basisByAtom } = computeMullikenCharges(
    basisFunctions,
    densityMatrix,
    overlapMatrix,
    basisModel.atomValenceMap
  );

  let homoIndex = 0;
  for (let index = occupancies.length - 1; index >= 0; index -= 1) {
    if (occupancies[index] > 0) {
      homoIndex = index;
      break;
    }
  }
  const lumoIndex = Math.min(homoIndex + 1, occupancies.length - 1);

  return {
    atoms,
    basisFunctions,
    overlapMatrix,
    hamiltonianMatrix,
    coefficientMatrix: normalizedCoefficients,
    orbitalEnergies: decomposition.eigenvalues,
    occupancies,
    densityMatrix,
    electronCount: basisModel.electronCount,
    electronCountCheck: traceProduct(densityMatrix, overlapMatrix),
    basisByAtom,
    populations,
    charges,
    overlapPopulations: {
      O_C: computeBondOverlapPopulation('O', 'C', densityMatrix, overlapMatrix, basisByAtom),
      C_Cl: computeBondOverlapPopulation('C', 'Cl', densityMatrix, overlapMatrix, basisByAtom),
      O_H: computeBondOverlapPopulation('O', 'H_oh', densityMatrix, overlapMatrix, basisByAtom)
    },
    homoIndex,
    lumoIndex,
    frontierCoefficients: {
      homo: coefficientColumn(normalizedCoefficients, homoIndex),
      lumo: coefficientColumn(normalizedCoefficients, lumoIndex)
    }
  };
}

export function evaluateDensityAtPoint(model, point) {
  const values = evaluateBasisVector(model.basisFunctions, point);
  let density = 0;
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const rowValue = values[rowIndex];
    for (let columnIndex = 0; columnIndex < values.length; columnIndex += 1) {
      density += model.densityMatrix[rowIndex][columnIndex] * rowValue * values[columnIndex];
    }
  }
  return Math.max(density, 0);
}

export function evaluateOrbitalAmplitude(model, point, orbitalIndex) {
  const values = evaluateBasisVector(model.basisFunctions, point);
  let amplitude = 0;
  for (let basisIndex = 0; basisIndex < values.length; basisIndex += 1) {
    amplitude += model.coefficientMatrix[basisIndex][orbitalIndex] * values[basisIndex];
  }
  return amplitude;
}

export function evaluateQuantityAtPoint(model, point, quantity) {
  switch (quantity) {
    case 'density':
      return evaluateDensityAtPoint(model, point);
    case 'homo-amplitude':
      return evaluateOrbitalAmplitude(model, point, model.homoIndex);
    case 'lumo-amplitude':
      return evaluateOrbitalAmplitude(model, point, model.lumoIndex);
    case 'homo-density': {
      const amplitude = evaluateOrbitalAmplitude(model, point, model.homoIndex);
      return amplitude * amplitude;
    }
    case 'lumo-density': {
      const amplitude = evaluateOrbitalAmplitude(model, point, model.lumoIndex);
      return amplitude * amplitude;
    }
    default:
      throw new Error(`Unsupported quantity: ${quantity}`);
  }
}

export function evaluateDeltaDensityAtPoint(currentModel, referenceModel, point) {
  return evaluateDensityAtPoint(currentModel, point) - evaluateDensityAtPoint(referenceModel, point);
}
