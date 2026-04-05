export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start, end, t) {
  return start + ((end - start) * t);
}

export function smoothstep(start, end, value) {
  if (start === end) {
    return value >= end ? 1 : 0;
  }
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - (2 * t));
}

export function percentile(values, probability) {
  if (!values.length) {
    return 0;
  }

  const sorted = values.slice().sort((left, right) => left - right);
  const index = clamp((sorted.length - 1) * probability, 0, sorted.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }
  return lerp(sorted[lowerIndex], sorted[upperIndex], index - lowerIndex);
}

export function linspace(start, end, count) {
  if (count <= 1) {
    return [start];
  }
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => start + (index * step));
}
