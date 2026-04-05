import { clamp, lerp } from '../math/numerics.js';

const PALETTES = {
  orbital: [
    [0.0, [0.42, 0.08, 0.58]],
    [0.25, [0.86, 0.23, 0.82]],
    [0.5, [0.03, 0.05, 0.10]],
    [0.75, [0.99, 0.72, 0.18]],
    [1.0, [1.00, 0.95, 0.72]]
  ],
  delta: [
    [0.0, [0.79, 0.18, 0.73]],
    [0.27, [0.95, 0.43, 0.82]],
    [0.5, [0.03, 0.05, 0.10]],
    [0.76, [0.12, 0.72, 0.93]],
    [1.0, [0.74, 0.97, 1.00]]
  ],
  density: [
    [0.0, [0.02, 0.03, 0.08]],
    [0.24, [0.10, 0.14, 0.36]],
    [0.52, [0.12, 0.42, 0.92]],
    [0.78, [0.40, 0.84, 0.98]],
    [1.0, [0.98, 0.99, 1.00]]
  ]
};

function mix(left, right, t) {
  return [
    lerp(left[0], right[0], t),
    lerp(left[1], right[1], t),
    lerp(left[2], right[2], t)
  ];
}

function interpolateStops(stops, value) {
  const t = clamp(value, 0, 1);

  for (let index = 0; index < stops.length - 1; index += 1) {
    const [startOffset, startColor] = stops[index];
    const [endOffset, endColor] = stops[index + 1];

    if (t >= startOffset && t <= endOffset) {
      const localT = (t - startOffset) / (endOffset - startOffset || 1);
      return mix(startColor, endColor, localT);
    }
  }

  return stops[stops.length - 1][1];
}

function shapeDivergingMagnitude(metric) {
  return clamp(Math.abs(metric), 0, 1) ** 0.68;
}

export function colorForMetric(metric, view) {
  if (view === 'reactive-donor' || view === 'reactive-acceptor' || view === 'homo-probability' || view === 'lumo-probability') {
    const magnitude = shapeDivergingMagnitude(metric);
    return interpolateStops(PALETTES.orbital, (metric >= 0 ? 0.5 + (0.5 * magnitude) : 0.5 - (0.5 * magnitude)));
  }

  if (view === 'reactive-flow' || view === 'delta-density') {
    const magnitude = shapeDivergingMagnitude(metric);
    return interpolateStops(PALETTES.delta, (metric >= 0 ? 0.5 + (0.5 * magnitude) : 0.5 - (0.5 * magnitude)));
  }

  const sequential = clamp(metric, 0, 1) ** 0.58;
  return interpolateStops(PALETTES.density, sequential);
}

export function legendGradientForView(view) {
  const palette = view === 'reactive-donor' || view === 'reactive-acceptor' || view === 'homo-probability' || view === 'lumo-probability'
    ? PALETTES.orbital
    : view === 'reactive-flow' || view === 'delta-density'
      ? PALETTES.delta
      : PALETTES.density;

  const stops = palette
    .map(([offset, [r, g, b]]) => `${`rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`} ${Math.round(offset * 100)}%`)
    .join(', ');

  return `linear-gradient(90deg, ${stops})`;
}

export function legendLabelsForView(view) {
  if (view === 'reactive-donor' || view === 'reactive-acceptor' || view === 'homo-probability' || view === 'lumo-probability') {
    return {
      left: '− phase',
      center: 'node / ψ ≈ 0',
      right: '+ phase'
    };
  }

  if (view === 'reactive-flow' || view === 'delta-density') {
    return {
      left: 'density loss',
      center: 'no change',
      right: 'density gain'
    };
  }

  return {
    left: 'low density',
    center: 'mid range',
    right: 'high density'
  };
}
