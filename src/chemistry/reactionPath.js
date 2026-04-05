import { lerp, smoothstep } from '../math/numerics.js';

const C_H_BOND_LENGTH = 1.09;
const O_H_BOND_LENGTH = 0.96;
const O_C_REACTANT_DISTANCE = 3.20;
const O_C_TS_DISTANCE = 2.08;
const O_C_PRODUCT_DISTANCE = 1.43;
const C_CL_REACTANT_DISTANCE = 1.78;
const C_CL_TS_DISTANCE = 2.08;
const C_CL_PRODUCT_DISTANCE = 3.85;
const O_C_H_ANGLE_DEGREES = 108.5;
const FULL_ROTATION = Math.PI * 2;

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function unitVectorFromPolar(angle, azimuth) {
  const sine = Math.sin(angle);
  return [
    Math.cos(angle),
    sine * Math.cos(azimuth),
    sine * Math.sin(azimuth)
  ];
}

function piecewiseDistance(progress, startDistance, transitionDistance, endDistance) {
  if (progress <= 0.5) {
    const t = smoothstep(0, 0.5, progress);
    return lerp(startDistance, transitionDistance, t);
  }
  const t = smoothstep(0.5, 1, progress);
  return lerp(transitionDistance, endDistance, t);
}

function buildMethylHydrogenDirections(progress) {
  const xComponent = lerp(-1 / 3, 1 / 3, smoothstep(0, 1, progress));
  const radialComponent = Math.sqrt(Math.max(1 - (xComponent ** 2), 0));

  return [0, 1, 2].map((index) => {
    const azimuth = (index / 3) * FULL_ROTATION;
    return [
      xComponent,
      radialComponent * Math.cos(azimuth),
      radialComponent * Math.sin(azimuth)
    ];
  });
}

function scaleVector([x, y, z], scalar) {
  return [x * scalar, y * scalar, z * scalar];
}

function addVectors([ax, ay, az], [bx, by, bz]) {
  return [ax + bx, ay + by, az + bz];
}

function distance(left, right) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dz = left.z - right.z;
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}

function bondOrder(progress, mode) {
  if (mode === 'forming') {
    return smoothstep(0.2, 0.95, progress);
  }
  if (mode === 'breaking') {
    return 1 - smoothstep(0.05, 0.8, progress);
  }
  return 1;
}

function buildAtom(id, element, position, options = {}) {
  return {
    id,
    element,
    label: options.label ?? element,
    x: position[0],
    y: position[1],
    z: position[2],
    kind: options.kind ?? 'main'
  };
}

export function getReactionGeometry(progress) {
  const oCDistance = piecewiseDistance(progress, O_C_REACTANT_DISTANCE, O_C_TS_DISTANCE, O_C_PRODUCT_DISTANCE);
  const cClDistance = piecewiseDistance(progress, C_CL_REACTANT_DISTANCE, C_CL_TS_DISTANCE, C_CL_PRODUCT_DISTANCE);

  const carbonPosition = [0, 0, 0];
  const oxygenPosition = [-oCDistance, 0, 0];
  const chlorinePosition = [cClDistance, 0, 0];

  const hDirection = unitVectorFromPolar(degreesToRadians(O_C_H_ANGLE_DEGREES), Math.PI / 2);
  const hydroxylHydrogenPosition = addVectors(oxygenPosition, scaleVector(hDirection, O_H_BOND_LENGTH));

  const methylHydrogenPositions = buildMethylHydrogenDirections(progress)
    .map((direction) => addVectors(carbonPosition, scaleVector(direction, C_H_BOND_LENGTH)));

  const atoms = [
    buildAtom('O', 'O', oxygenPosition, { kind: 'reactive' }),
    buildAtom('H_oh', 'H', hydroxylHydrogenPosition, { label: 'H', kind: 'spectator' }),
    buildAtom('C', 'C', carbonPosition, { kind: 'reactive' }),
    buildAtom('Cl', 'Cl', chlorinePosition, { kind: 'reactive' })
  ];

  methylHydrogenPositions.forEach((position, index) => {
    atoms.push(buildAtom(`H_c${index + 1}`, 'H', position, { label: 'H', kind: 'spectator' }));
  });

  const atomMap = Object.fromEntries(atoms.map((atom) => [atom.id, atom]));

  const bonds = [
    { atoms: ['O', 'H_oh'], order: 1, role: 'context' },
    { atoms: ['C', 'H_c1'], order: 1, role: 'spectator' },
    { atoms: ['C', 'H_c2'], order: 1, role: 'spectator' },
    { atoms: ['C', 'H_c3'], order: 1, role: 'spectator' },
    { atoms: ['O', 'C'], order: bondOrder(progress, 'forming'), role: 'reactive' },
    { atoms: ['C', 'Cl'], order: bondOrder(progress, 'breaking'), role: 'reactive' }
  ];

  return {
    progress,
    atoms,
    bonds,
    metrics: {
      oCDistance,
      cClDistance,
      carbonInversionX: methylHydrogenPositions.reduce((sum, position) => sum + position[0], 0) / methylHydrogenPositions.length,
      oHDistance: distance(atomMap.O, atomMap.H_oh)
    }
  };
}

export function computeBounds(atoms, padding = 2.2) {
  const xs = atoms.map((atom) => atom.x);
  const ys = atoms.map((atom) => atom.y);
  const zs = atoms.map((atom) => atom.z);

  return {
    minX: Math.min(...xs) - padding,
    maxX: Math.max(...xs) + padding,
    minY: Math.min(...ys) - padding,
    maxY: Math.max(...ys) + padding,
    minZ: Math.min(...zs) - padding,
    maxZ: Math.max(...zs) + padding
  };
}
