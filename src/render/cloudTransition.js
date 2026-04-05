import { lerp } from '../math/numerics.js';

export function cloneCloud(cloud) {
  return {
    positions: new Float32Array(cloud.positions),
    colors: new Float32Array(cloud.colors),
    alphas: new Float32Array(cloud.alphas),
    sizes: new Float32Array(cloud.sizes),
    count: cloud.count
  };
}

export function createCloudBuffer(count) {
  return {
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    alphas: new Float32Array(count),
    sizes: new Float32Array(count),
    count
  };
}

export function areCloudsCompatible(left, right) {
  return Boolean(left && right)
    && left.count === right.count
    && left.positions.length === right.positions.length
    && left.colors.length === right.colors.length
    && left.alphas.length === right.alphas.length
    && left.sizes.length === right.sizes.length;
}

export function blendClouds(fromCloud, toCloud, t, outCloud = null) {
  if (!areCloudsCompatible(fromCloud, toCloud)) {
    return cloneCloud(toCloud);
  }

  const blended = outCloud && areCloudsCompatible(outCloud, toCloud)
    ? outCloud
    : createCloudBuffer(toCloud.count);
  const mix = Math.min(Math.max(t, 0), 1);

  for (let index = 0; index < toCloud.positions.length; index += 1) {
    blended.positions[index] = lerp(fromCloud.positions[index], toCloud.positions[index], mix);
    blended.colors[index] = lerp(fromCloud.colors[index], toCloud.colors[index], mix);
  }

  for (let index = 0; index < toCloud.alphas.length; index += 1) {
    blended.alphas[index] = lerp(fromCloud.alphas[index], toCloud.alphas[index], mix);
    blended.sizes[index] = lerp(fromCloud.sizes[index], toCloud.sizes[index], mix);
  }

  blended.count = toCloud.count;
  return blended;
}
