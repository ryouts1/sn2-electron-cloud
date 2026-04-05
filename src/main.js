import { reactionPreset } from './data/reactionPreset.js';
import { getReactionState } from './model/reactionModel.js';
import { renderReactionScene } from './render/reactionScene.js';
import { renderEnergyProfile } from './render/energyProfile.js';

const sceneElement = document.querySelector('#reaction-scene');
const progressSlider = document.querySelector('#progress-slider');
const progressOutput = document.querySelector('#progress-output');
const playButton = document.querySelector('#play-button');
const resetButton = document.querySelector('#reset-button');
const stageChip = document.querySelector('#stage-chip');
const stageDescription = document.querySelector('#stage-description');
const reactionStats = document.querySelector('#reaction-stats');
const reactionEquation = document.querySelector('#reaction-equation');
const assumptionList = document.querySelector('#assumption-list');
const energyProfile = document.querySelector('#energy-profile');
const projectSummary = document.querySelector('#project-summary');

const formatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const state = {
  progress: 0,
  isPlaying: false,
  animationFrameId: null,
  previousTimestamp: 0
};

function progressToSliderValue(progress) {
  return Math.round(progress * 1000);
}

function sliderValueToProgress(value) {
  return Number.parseInt(value, 10) / 1000;
}

function renderAssumptions() {
  assumptionList.innerHTML = reactionPreset.assumptions
    .map((assumption) => `<li>${assumption}</li>`)
    .join('');
}

function renderStatsPanel(reactionState) {
  const stats = [
    ['C–O bond order', formatter.format(reactionState.metrics.ocBondOrder)],
    ['C–Br bond order', formatter.format(reactionState.metrics.cbrBondOrder)],
    ['relative energy', formatter.format(reactionState.metrics.energy)],
    ['Br departure', formatter.format(reactionState.metrics.bromineDeparture)],
    ['inversion progress', formatter.format(reactionState.metrics.inversion)]
  ];

  reactionStats.innerHTML = stats
    .map(
      ([label, value]) => `
        <div class="stat-row">
          <dt>${label}</dt>
          <dd>${value}</dd>
        </div>
      `
    )
    .join('');
}

function updatePlayButton() {
  playButton.textContent = state.isPlaying ? '停止' : '再生';
}

function render() {
  const reactionState = getReactionState(state.progress);

  progressSlider.value = String(progressToSliderValue(state.progress));
  progressOutput.textContent = `${Math.round(state.progress * 100)}%`;
  stageChip.textContent = reactionState.stage.label;
  stageDescription.textContent = reactionState.stage.description;

  renderReactionScene(sceneElement, reactionState);
  renderEnergyProfile(energyProfile, state.progress);
  renderStatsPanel(reactionState);
  updatePlayButton();
}

function stopPlayback() {
  state.isPlaying = false;

  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }

  updatePlayButton();
}

function tick(timestamp) {
  if (!state.isPlaying) {
    return;
  }

  if (state.previousTimestamp === 0) {
    state.previousTimestamp = timestamp;
  }

  const deltaSeconds = (timestamp - state.previousTimestamp) / 1000;
  state.previousTimestamp = timestamp;
  state.progress = Math.min(1, state.progress + deltaSeconds * 0.14);

  render();

  if (state.progress >= 1) {
    stopPlayback();
    state.previousTimestamp = 0;
    return;
  }

  state.animationFrameId = requestAnimationFrame(tick);
}

function togglePlayback() {
  state.isPlaying = !state.isPlaying;
  state.previousTimestamp = 0;
  updatePlayButton();

  if (state.isPlaying) {
    state.animationFrameId = requestAnimationFrame(tick);
  } else if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
}

function resetSimulation() {
  stopPlayback();
  state.progress = 0;
  state.previousTimestamp = 0;
  render();
}

function handleSliderInput(event) {
  state.progress = sliderValueToProgress(event.target.value);
  render();
}

function initializeStaticText() {
  reactionEquation.textContent = reactionPreset.equation;
  projectSummary.textContent = reactionPreset.summary;
  renderAssumptions();
}

progressSlider.addEventListener('input', handleSliderInput);
playButton.addEventListener('click', togglePlayback);
resetButton.addEventListener('click', resetSimulation);

initializeStaticText();
render();
