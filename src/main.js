import { Scene3D } from './render/scene3d.js';
import { drawEnergyDiagram } from './render/energyDiagram.js';

const viewer = document.getElementById('viewer');
const progressRange = document.getElementById('progress-range');
const progressLabel = document.getElementById('progress-label');
const viewModeSelect = document.getElementById('view-mode');
const gridResolutionSelect = document.getElementById('grid-resolution');
const isoRange = document.getElementById('iso-range');
const isoLabel = document.getElementById('iso-label');
const autoIsoCheckbox = document.getElementById('auto-iso');
const playToggle = document.getElementById('play-toggle');
const resetViewButton = document.getElementById('reset-view');
const presetReactantsButton = document.getElementById('preset-reactants');
const presetTsButton = document.getElementById('preset-ts');
const presetProductsButton = document.getElementById('preset-products');
const statusBox = document.getElementById('status-box');
const metricCards = document.getElementById('metric-cards');
const frontierSummary = document.getElementById('frontier-summary');
const bondSummary = document.getElementById('bond-summary');
const chargeTableBody = document.querySelector('#charge-table tbody');
const energyDiagram = document.getElementById('energy-diagram');
const viewerLegend = document.getElementById('viewer-legend');

const scene = new Scene3D(viewer);
const worker = new Worker(new URL('./worker/densityWorker.js', import.meta.url), { type: 'module' });

const state = {
  progress: 0,
  view: 'valence-density',
  resolution: 34,
  iso: 22,
  autoIso: true,
  playing: false,
  basisScale: 1,
  couplingScale: 1.75
};

let lastRequestedId = 0;
let latestPayload = null;
let animationHandle = null;
let previousTimestamp = null;
let computeTimer = null;

function formatNumber(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function formatSigned(value, digits = 3) {
  const number = Number(value);
  return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}`;
}

function setStatus(text) {
  statusBox.textContent = text;
}

function syncProgressLabel() {
  progressLabel.textContent = formatNumber(state.progress, 2);
}

function syncIsoLabel() {
  isoLabel.textContent = String(state.iso);
}

function setLegend(view) {
  const legendContent = {
    'valence-density': [
      'cyan surface = valence density isosurface',
      'atoms = O / C / Cl / H nuclei',
      'bond cylinders = geometric reaction path'
    ],
    'total-density': [
      'violet surface = valence + pseudo-core density',
      'pseudo-core is display-only, not a many-electron all-core solver'
    ],
    'delta-density': [
      'cyan = density gain vs reactants',
      'pink = density loss vs reactants'
    ],
    'homo-phase': [
      'violet = HOMO positive phase',
      'amber = HOMO negative phase'
    ],
    'lumo-phase': [
      'violet = LUMO positive phase',
      'amber = LUMO negative phase'
    ]
  };

  viewerLegend.innerHTML = legendContent[view]
    .map((label) => `<span class="legend-pill">${label}</span>`)
    .join('');
}

function renderMetricCards(payload) {
  const netCharge = Object.values(payload.summary.charges)
    .reduce((sum, charge) => sum + charge, 0);
  const integralLabel = payload.view === 'delta-density'
    ? 'Δρ integral'
    : payload.view.endsWith('phase')
      ? 'Signed field integral'
      : 'Grid integral';

  const cards = [
    ['O···C distance', `${formatNumber(payload.metrics.oCDistance, 2)} Å`],
    ['C···Cl distance', `${formatNumber(payload.metrics.cClDistance, 2)} Å`],
    [integralLabel, formatNumber(payload.stats.integral, 3)],
    ['Tr[PS] electron count', formatNumber(payload.summary.electronCountCheck, 4)],
    ['HOMO–LUMO gap', `${formatNumber(payload.summary.gap, 2)} eV`],
    ['Net charge', formatSigned(netCharge, 3)]
  ];

  metricCards.innerHTML = cards
    .map(([label, value]) => `
      <article class="metric-card">
        <span class="label">${label}</span>
        <span class="value">${value}</span>
      </article>
    `)
    .join('');
}

function renderKeyValueList(container, rows) {
  container.innerHTML = rows
    .map(([label, value]) => `<span>${label}</span><strong>${value}</strong>`)
    .join('');
}

function renderChargeTable(charges) {
  chargeTableBody.innerHTML = Object.entries(charges)
    .map(([atomId, charge]) => `
      <tr>
        <td>${atomId}</td>
        <td>${formatSigned(charge, 3)}</td>
      </tr>
    `)
    .join('');
}

function applyPayload(payload) {
  latestPayload = payload;
  if (state.autoIso) {
    state.iso = Math.round(payload.stats.suggestedIsoScaled);
    isoRange.value = String(state.iso);
    syncIsoLabel();
  }

  scene.update({
    ...payload,
    positiveField: new Float32Array(payload.positiveField),
    negativeField: new Float32Array(payload.negativeField)
  }, {
    isolation: state.iso
  });

  renderMetricCards(payload);
  renderKeyValueList(frontierSummary, [
    ['HOMO index', String(payload.summary.homoIndex)],
    ['LUMO index', String(payload.summary.lumoIndex)],
    ['HOMO energy', `${formatNumber(payload.summary.homoEnergy, 3)} eV`],
    ['LUMO energy', `${formatNumber(payload.summary.lumoEnergy, 3)} eV`],
    ['Basis functions', String(payload.summary.basisFunctionCount)],
    ['Valence electrons', String(payload.summary.valenceElectronCount)]
  ]);
  renderKeyValueList(bondSummary, [
    ['O–C overlap population', formatNumber(payload.summary.overlapPopulations.O_C, 4)],
    ['C–Cl overlap population', formatNumber(payload.summary.overlapPopulations.C_Cl, 4)],
    ['O–H overlap population', formatNumber(payload.summary.overlapPopulations.O_H, 4)]
  ]);
  renderChargeTable(payload.summary.charges);
  drawEnergyDiagram(
    energyDiagram,
    payload.summary.orbitalEnergies,
    payload.summary.homoIndex,
    payload.summary.lumoIndex
  );
  setLegend(payload.view);

  setStatus(
    `resolution ${payload.resolution}³ · iso ${state.iso} · grid integral ${formatNumber(payload.stats.integral, 3)}`
  );
}


function scheduleComputation(delay = 60) {
  if (computeTimer !== null) {
    clearTimeout(computeTimer);
  }
  computeTimer = window.setTimeout(() => {
    computeTimer = null;
    requestFieldComputation();
  }, delay);
}

function requestFieldComputation() {
  lastRequestedId += 1;
  setStatus('Recomputing 3D field…');
  worker.postMessage({
    requestId: lastRequestedId,
    progress: state.progress,
    resolution: state.resolution,
    view: state.view,
    basisScale: state.basisScale,
    couplingScale: state.couplingScale
  });
}

worker.addEventListener('message', (event) => {
  const payload = event.data;
  if (payload.requestId !== lastRequestedId) {
    return;
  }

  if (payload.error) {
    setStatus(`Error: ${payload.error}`);
    return;
  }

  applyPayload(payload);
});

function setProgress(nextProgress) {
  state.progress = Math.min(Math.max(nextProgress, 0), 1);
  progressRange.value = String(Math.round(state.progress * 100));
  syncProgressLabel();
  scheduleComputation(80);
}

function togglePlayback() {
  state.playing = !state.playing;
  playToggle.textContent = state.playing ? 'Pause' : 'Play';

  if (state.playing) {
    previousTimestamp = null;
    const animate = (timestamp) => {
      if (!state.playing) {
        return;
      }
      if (previousTimestamp === null) {
        previousTimestamp = timestamp;
      }
      const delta = timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      const nextProgress = state.progress + (delta * 0.00012);
      if (nextProgress >= 1) {
        setProgress(1);
        state.playing = false;
        playToggle.textContent = 'Play';
        return;
      }
      setProgress(nextProgress);
      animationHandle = requestAnimationFrame(animate);
    };
    animationHandle = requestAnimationFrame(animate);
  } else if (animationHandle !== null) {
    cancelAnimationFrame(animationHandle);
    animationHandle = null;
  }
}

progressRange.addEventListener('input', () => {
  if (state.playing) {
    togglePlayback();
  }
  state.progress = Number(progressRange.value) / 100;
  syncProgressLabel();
  scheduleComputation(80);
});

viewModeSelect.addEventListener('change', () => {
  state.view = viewModeSelect.value;
  scheduleComputation(80);
});

gridResolutionSelect.addEventListener('change', () => {
  state.resolution = Number(gridResolutionSelect.value);
  scheduleComputation(80);
});

isoRange.addEventListener('input', () => {
  state.iso = Number(isoRange.value);
  syncIsoLabel();
  if (latestPayload) {
    scene.update({
      ...latestPayload,
      positiveField: new Float32Array(latestPayload.positiveField),
      negativeField: new Float32Array(latestPayload.negativeField)
    }, {
      isolation: state.iso
    });
    setStatus(`resolution ${latestPayload.resolution}³ · iso ${state.iso} · grid integral ${formatNumber(latestPayload.stats.integral, 3)}`);
  }
});

autoIsoCheckbox.addEventListener('change', () => {
  state.autoIso = autoIsoCheckbox.checked;
  if (state.autoIso && latestPayload) {
    state.iso = Math.round(latestPayload.stats.suggestedIsoScaled);
    isoRange.value = String(state.iso);
    syncIsoLabel();
    scene.update({
      ...latestPayload,
      positiveField: new Float32Array(latestPayload.positiveField),
      negativeField: new Float32Array(latestPayload.negativeField)
    }, {
      isolation: state.iso
    });
  }
});

playToggle.addEventListener('click', togglePlayback);
resetViewButton.addEventListener('click', () => scene.resetCamera?.());
presetReactantsButton.addEventListener('click', () => setProgress(0));
presetTsButton.addEventListener('click', () => setProgress(0.5));
presetProductsButton.addEventListener('click', () => setProgress(1));

syncProgressLabel();
syncIsoLabel();
setLegend(state.view);
requestFieldComputation();
