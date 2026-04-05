const INITIAL_POINTS = {
  oxygen: { x: 118, y: 240 },
  carbon: { x: 360, y: 240 },
  bromine: { x: 548, y: 240 },
  hydrogenA: { x: 360, y: 126 },
  hydrogenB: { x: 456, y: 308 },
  hydrogenC: { x: 284, y: 308 }
};

const FINAL_POINTS = {
  oxygen: { x: 238, y: 240 },
  bromine: { x: 650, y: 240 },
  hydrogenA: { x: 360, y: 354 },
  hydrogenB: { x: 456, y: 172 },
  hydrogenC: { x: 284, y: 172 }
};

const OXYGEN_HYDROGEN_OFFSET = { x: -28, y: -76 };

export const STAGE_DEFINITIONS = [
  {
    key: 'reactant',
    label: '反応物接近',
    start: 0.0,
    end: 0.22,
    description:
      '水酸化物イオンが臭化メチルの backside に回り込み、O の孤立電子対が求核攻撃の向きを取る。'
  },
  {
    key: 'approach',
    label: '求核攻撃',
    start: 0.22,
    end: 0.45,
    description:
      'O の電子対が C へ近づき、C–Br 結合電子雲が少しずつ Br 側へ偏る。'
  },
  {
    key: 'transition',
    label: '遷移状態',
    start: 0.45,
    end: 0.58,
    description:
      'C–O と C–Br がともに部分結合となり、電子密度が 3 中心的に広がる。'
  },
  {
    key: 'departure',
    label: '脱離',
    start: 0.58,
    end: 0.82,
    description:
      'O–C 結合が固まり、C–Br の電子対は Br 側へ移って脱離が進む。'
  },
  {
    key: 'product',
    label: '生成物',
    start: 0.82,
    end: 1.01,
    description:
      'メタノールと臭化物イオンに分かれ、O は 2 つの孤立電子対を持つ状態へ落ち着く。'
  }
];

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

export function mixPoint(start, end, progress) {
  return {
    x: lerp(start.x, end.x, progress),
    y: lerp(start.y, end.y, progress)
  };
}

export function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const normalized = clamp01((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
}

export function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function toFixedNumber(value, digits = 2) {
  return Number.parseFloat(value.toFixed(digits));
}

export function getEnergy(progress) {
  const t = clamp01(progress);
  const barrier = 1.18 * Math.exp(-((t - 0.5) ** 2) / 0.018);
  const baseline = lerp(0.38, 0.16, t);
  return baseline + barrier;
}

export function getCurrentStage(progress) {
  const t = clamp01(progress);
  return STAGE_DEFINITIONS.find((stage) => t >= stage.start && t < stage.end) ?? STAGE_DEFINITIONS.at(-1);
}

function buildChargeLabels({ oxygen, carbon, bromine, progress, bromineDeparture }) {
  const labels = [];

  const oxygenOpacity = 1 - smoothstep(0.68, 0.88, progress);
  if (oxygenOpacity > 0.05) {
    labels.push({
      text: '−',
      x: oxygen.x - 18,
      y: oxygen.y - 52,
      opacity: oxygenOpacity
    });
  }

  const carbonOpacity =
    smoothstep(0.06, 0.28, progress) * (1 - smoothstep(0.7, 0.88, progress));
  if (carbonOpacity > 0.05) {
    labels.push({
      text: 'δ+',
      x: carbon.x + 12,
      y: carbon.y - 56,
      opacity: carbonOpacity
    });
  }

  labels.push({
    text: progress < 0.78 ? 'δ−' : '−',
    x: bromine.x + 24,
    y: bromine.y - 54,
    opacity: 0.3 + 0.7 * bromineDeparture
  });

  return labels;
}

function buildElectronClouds({ oxygen, carbon, bromine, ocBondOrder, cbrBondOrder, bromineDeparture }) {
  const midpointOC = midpoint(oxygen, carbon);
  const midpointCBr = midpoint(carbon, bromine);

  const attackLobeProgress = smoothstep(0.08, 0.6, ocBondOrder);
  const attackLobeCenter = {
    x: lerp(oxygen.x + 28, midpointOC.x, attackLobeProgress),
    y: oxygen.y
  };

  return [
    {
      kind: 'lone-pair',
      cx: oxygen.x - 18,
      cy: oxygen.y - 42,
      rx: 22,
      ry: 12,
      rotation: -26,
      opacity: 0.26
    },
    {
      kind: 'lone-pair',
      cx: oxygen.x - 18,
      cy: oxygen.y + 42,
      rx: 22,
      ry: 12,
      rotation: 26,
      opacity: 0.26
    },
    {
      kind: 'attack',
      cx: attackLobeCenter.x,
      cy: attackLobeCenter.y,
      rx: lerp(18, 42, ocBondOrder),
      ry: lerp(10, 18, ocBondOrder),
      rotation: 0,
      opacity: 0.14 + 0.2 * (1 - Math.abs(ocBondOrder - 0.5) * 2)
    },
    {
      kind: 'bonding',
      cx: midpointOC.x,
      cy: midpointOC.y,
      rx: 30 + ocBondOrder * 24,
      ry: 14 + ocBondOrder * 5,
      rotation: 0,
      opacity: 0.04 + ocBondOrder * 0.3
    },
    {
      kind: 'leaving',
      cx: midpointCBr.x,
      cy: midpointCBr.y,
      rx: 30 + cbrBondOrder * 24,
      ry: 14 + cbrBondOrder * 5,
      rotation: 0,
      opacity: 0.04 + cbrBondOrder * 0.28
    },
    {
      kind: 'bromide',
      cx: bromine.x + 4,
      cy: bromine.y,
      rx: 34 + bromineDeparture * 20,
      ry: 24 + bromineDeparture * 12,
      rotation: 0,
      opacity: 0.05 + bromineDeparture * 0.26
    }
  ];
}

function buildArrows({ oxygen, carbon, bromine, progress, bromineDeparture }) {
  const attackArrowOpacity = 0.18 + 0.52 * (1 - smoothstep(0.72, 0.94, progress));
  const leavingArrowOpacity = 0.1 + 0.66 * smoothstep(0.24, 0.82, progress);

  return [
    {
      kind: 'attack',
      opacity: attackArrowOpacity,
      path: [
        `M ${oxygen.x + 34} ${oxygen.y - 12}`,
        `Q ${oxygen.x + 106} ${oxygen.y - 102}, ${carbon.x - 24} ${carbon.y - 8}`
      ].join(' ')
    },
    {
      kind: 'leaving',
      opacity: leavingArrowOpacity,
      path: [
        `M ${carbon.x + 68} ${carbon.y - 18}`,
        `Q ${carbon.x + 132 + bromineDeparture * 36} ${carbon.y - 116}, ${bromine.x - 30} ${bromine.y - 8}`
      ].join(' ')
    }
  ];
}

export function getReactionState(progress) {
  const t = clamp01(progress);

  const oxygenApproach = smoothstep(0.0, 0.54, t);
  const bromineDeparture = smoothstep(0.46, 1.0, t);
  const bondProgress = smoothstep(0.12, 0.88, t);
  const inversion = smoothstep(0.18, 0.82, t);

  const oxygen = mixPoint(INITIAL_POINTS.oxygen, FINAL_POINTS.oxygen, oxygenApproach);
  const carbon = { ...INITIAL_POINTS.carbon };
  const bromine = mixPoint(INITIAL_POINTS.bromine, FINAL_POINTS.bromine, bromineDeparture);

  const oxygenHydrogen = {
    x: oxygen.x + OXYGEN_HYDROGEN_OFFSET.x,
    y: oxygen.y + OXYGEN_HYDROGEN_OFFSET.y
  };

  const hydrogens = [
    mixPoint(INITIAL_POINTS.hydrogenA, FINAL_POINTS.hydrogenA, inversion),
    mixPoint(INITIAL_POINTS.hydrogenB, FINAL_POINTS.hydrogenB, inversion),
    mixPoint(INITIAL_POINTS.hydrogenC, FINAL_POINTS.hydrogenC, inversion)
  ];

  const ocBondOrder = bondProgress;
  const cbrBondOrder = 1 - bondProgress;

  const atoms = [
    {
      id: 'oxygen',
      symbol: 'O',
      x: oxygen.x,
      y: oxygen.y,
      radius: 24,
      className: 'atom--oxygen'
    },
    {
      id: 'carbon',
      symbol: 'C',
      x: carbon.x,
      y: carbon.y,
      radius: 21,
      className: 'atom--carbon'
    },
    {
      id: 'bromine',
      symbol: 'Br',
      x: bromine.x,
      y: bromine.y,
      radius: 29,
      className: 'atom--bromine'
    },
    {
      id: 'oxygen-hydrogen',
      symbol: 'H',
      x: oxygenHydrogen.x,
      y: oxygenHydrogen.y,
      radius: 14,
      className: 'atom--hydrogen'
    },
    ...hydrogens.map((atom, index) => ({
      id: `hydrogen-${index + 1}`,
      symbol: 'H',
      x: atom.x,
      y: atom.y,
      radius: 14,
      className: 'atom--hydrogen'
    }))
  ];

  const bonds = [
    {
      id: 'o-h',
      from: oxygen,
      to: oxygenHydrogen,
      order: 1,
      kind: 'single'
    },
    {
      id: 'o-c',
      from: oxygen,
      to: carbon,
      order: ocBondOrder,
      kind: 'forming'
    },
    {
      id: 'c-br',
      from: carbon,
      to: bromine,
      order: cbrBondOrder,
      kind: 'breaking'
    },
    ...hydrogens.map((atom, index) => ({
      id: `c-h-${index + 1}`,
      from: carbon,
      to: atom,
      order: 1,
      kind: 'single'
    }))
  ];

  const stage = getCurrentStage(t);
  const energy = getEnergy(t);

  return {
    progress: t,
    stage,
    atoms,
    bonds,
    electronClouds: buildElectronClouds({ oxygen, carbon, bromine, ocBondOrder, cbrBondOrder, bromineDeparture }),
    arrows: buildArrows({ oxygen, carbon, bromine, progress: t, bromineDeparture }),
    chargeLabels: buildChargeLabels({ oxygen, carbon, bromine, progress: t, bromineDeparture }),
    metrics: {
      ocBondOrder: toFixedNumber(ocBondOrder),
      cbrBondOrder: toFixedNumber(cbrBondOrder),
      energy: toFixedNumber(energy),
      bromineDeparture: toFixedNumber(bromineDeparture),
      inversion: toFixedNumber(inversion)
    }
  };
}
