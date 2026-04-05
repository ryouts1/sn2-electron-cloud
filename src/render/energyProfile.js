import { getEnergy } from '../model/reactionModel.js';

function scaleX(progress) {
  return 34 + progress * 292;
}

function scaleY(energy) {
  const min = 0;
  const max = 1.75;
  const clamped = Math.min(max, Math.max(min, energy));
  const normalized = (clamped - min) / (max - min);
  return 168 - normalized * 128;
}

function formatNumber(value) {
  return Number.parseFloat(value.toFixed(2));
}

function buildCurvePath() {
  const points = [];

  for (let step = 0; step <= 100; step += 1) {
    const progress = step / 100;
    points.push(`${step === 0 ? 'M' : 'L'} ${formatNumber(scaleX(progress))} ${formatNumber(scaleY(getEnergy(progress)))}`);
  }

  return points.join(' ');
}

export function renderEnergyProfile(containerElement, progress) {
  const currentEnergy = getEnergy(progress);
  const markerX = scaleX(progress);
  const markerY = scaleY(currentEnergy);

  containerElement.innerHTML = `
    <svg viewBox="0 0 360 190" class="energy-svg" role="img" aria-label="Reaction energy profile">
      <rect x="0" y="0" width="360" height="190" rx="14" class="energy-background" />
      <line x1="34" y1="168" x2="326" y2="168" class="energy-axis" />
      <line x1="34" y1="24" x2="34" y2="168" class="energy-axis" />
      <path d="${buildCurvePath()}" class="energy-curve" />
      <circle cx="${formatNumber(markerX)}" cy="${formatNumber(markerY)}" r="5.5" class="energy-marker" />
      <text x="34" y="184" class="energy-label">reactant</text>
      <text x="268" y="184" class="energy-label">product</text>
      <text x="8" y="28" class="energy-label energy-label--vertical">E</text>
      <text x="140" y="184" class="energy-label">reaction coordinate</text>
    </svg>
  `;
}
