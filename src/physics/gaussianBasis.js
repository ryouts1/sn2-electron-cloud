import { ELEMENTS, TOTAL_VALENCE_ELECTRONS } from '../chemistry/elements.js';

const AXES = ['x', 'y', 'z'];
const ANGULAR_MOMENTA = {
  s: [0, 0, 0],
  px: [1, 0, 0],
  py: [0, 1, 0],
  pz: [0, 0, 1]
};

function doubleFactorial(n) {
  if (n <= 0) {
    return 1;
  }

  let product = 1;
  for (let value = n; value > 1; value -= 2) {
    product *= value;
  }
  return product;
}

export function gaussianNormalization(exponent, angularMomentum) {
  const [lx, ly, lz] = angularMomentum;
  const totalAngular = lx + ly + lz;
  const numerator = (2 ** ((2 * totalAngular) + 1.5)) * (exponent ** (totalAngular + 1.5));
  const denominator = (Math.PI ** 1.5)
    * doubleFactorial((2 * lx) - 1)
    * doubleFactorial((2 * ly) - 1)
    * doubleFactorial((2 * lz) - 1);
  return Math.sqrt(numerator / denominator);
}

function oneDimensionalMoment(l1, l2, centerA, centerB, exponentA, exponentB) {
  const totalExponent = exponentA + exponentB;
  const productCenter = ((exponentA * centerA) + (exponentB * centerB)) / totalExponent;
  const displacementA = productCenter - centerA;
  const displacementB = productCenter - centerB;
  const prefactor = Math.sqrt(Math.PI / totalExponent)
    * Math.exp((-(exponentA * exponentB) / totalExponent) * ((centerA - centerB) ** 2));

  if (l1 === 0 && l2 === 0) {
    return prefactor;
  }
  if (l1 === 1 && l2 === 0) {
    return displacementA * prefactor;
  }
  if (l1 === 0 && l2 === 1) {
    return displacementB * prefactor;
  }
  if (l1 === 1 && l2 === 1) {
    return ((displacementA * displacementB) + (1 / (2 * totalExponent))) * prefactor;
  }

  throw new Error(`Unsupported angular momentum pair (${l1}, ${l2}).`);
}

export function evaluateBasisFunction(basisFunction, point) {
  const [lx, ly, lz] = basisFunction.angularMomentum;
  const dx = point.x - basisFunction.center.x;
  const dy = point.y - basisFunction.center.y;
  const dz = point.z - basisFunction.center.z;
  const radiusSquared = (dx * dx) + (dy * dy) + (dz * dz);
  const polynomial = (dx ** lx) * (dy ** ly) * (dz ** lz);
  return basisFunction.normalization * polynomial * Math.exp(-basisFunction.exponent * radiusSquared);
}

export function overlapIntegral(left, right) {
  const xMoment = oneDimensionalMoment(
    left.angularMomentum[0],
    right.angularMomentum[0],
    left.center.x,
    right.center.x,
    left.exponent,
    right.exponent
  );
  const yMoment = oneDimensionalMoment(
    left.angularMomentum[1],
    right.angularMomentum[1],
    left.center.y,
    right.center.y,
    left.exponent,
    right.exponent
  );
  const zMoment = oneDimensionalMoment(
    left.angularMomentum[2],
    right.angularMomentum[2],
    left.center.z,
    right.center.z,
    left.exponent,
    right.exponent
  );

  return left.normalization * right.normalization * xMoment * yMoment * zMoment;
}

function buildBasisFunction(atom, orbitalType, parameters, basisScale) {
  const angularMomentum = ANGULAR_MOMENTA[orbitalType];
  const exponent = parameters.exponent * basisScale;
  return {
    id: `${atom.id}_${orbitalType}`,
    atomId: atom.id,
    element: atom.element,
    label: `${atom.label} ${parameters.principalQuantumNumber}${orbitalType}`,
    orbitalType,
    exponent,
    onsiteEnergy: parameters.onsiteEnergy,
    angularMomentum,
    normalization: gaussianNormalization(exponent, angularMomentum),
    center: {
      x: atom.x,
      y: atom.y,
      z: atom.z
    }
  };
}

export function buildValenceBasis(atoms, basisScale = 1) {
  const basis = [];

  atoms.forEach((atom) => {
    const element = ELEMENTS[atom.element];
    if (!element) {
      throw new Error(`Unsupported element: ${atom.element}`);
    }

    basis.push(buildBasisFunction(atom, 's', element.basis.s, basisScale));

    if (element.basis.p) {
      basis.push(buildBasisFunction(atom, 'px', element.basis.p, basisScale));
      basis.push(buildBasisFunction(atom, 'py', element.basis.p, basisScale));
      basis.push(buildBasisFunction(atom, 'pz', element.basis.p, basisScale));
    }
  });

  return {
    functions: basis,
    electronCount: TOTAL_VALENCE_ELECTRONS,
    atomValenceMap: Object.fromEntries(atoms.map((atom) => [atom.id, ELEMENTS[atom.element].valenceElectrons]))
  };
}

export function evaluateBasisVector(basisFunctions, point) {
  return basisFunctions.map((basisFunction) => evaluateBasisFunction(basisFunction, point));
}

export function basisSummary(basisFunctions) {
  return basisFunctions.reduce((summary, basisFunction) => {
    summary[basisFunction.atomId] ??= [];
    summary[basisFunction.atomId].push(basisFunction.label);
    return summary;
  }, {});
}

export function buildOverlapMatrix(basisFunctions) {
  const size = basisFunctions.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    for (let columnIndex = rowIndex; columnIndex < size; columnIndex += 1) {
      const overlap = overlapIntegral(basisFunctions[rowIndex], basisFunctions[columnIndex]);
      matrix[rowIndex][columnIndex] = overlap;
      matrix[columnIndex][rowIndex] = overlap;
    }
  }

  return matrix;
}

export function orbitalAxisLabel(basisFunction) {
  switch (basisFunction.orbitalType) {
    case 'px':
      return 'x';
    case 'py':
      return 'y';
    case 'pz':
      return 'z';
    default:
      return 's';
  }
}
