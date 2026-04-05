function formatNumber(value) {
  return Number.parseFloat(value.toFixed(2));
}

function renderCloud(cloud) {
  return `
    <ellipse
      class="electron-cloud electron-cloud--${cloud.kind}"
      cx="${formatNumber(cloud.cx)}"
      cy="${formatNumber(cloud.cy)}"
      rx="${formatNumber(cloud.rx)}"
      ry="${formatNumber(cloud.ry)}"
      transform="rotate(${formatNumber(cloud.rotation)} ${formatNumber(cloud.cx)} ${formatNumber(cloud.cy)})"
      opacity="${formatNumber(cloud.opacity)}"
      filter="url(#cloud-blur)"
    />
  `;
}

function renderBond(bond) {
  const opacity = bond.kind === 'single' ? 0.78 : 0.18 + bond.order * 0.82;
  const width = bond.kind === 'single' ? 3.2 : 2 + bond.order * 5.2;
  const dashArray =
    bond.kind === 'single'
      ? ''
      : bond.order > 0.94
        ? ''
        : 'stroke-dasharray="10 8"';

  if (bond.kind !== 'single' && bond.order < 0.02) {
    return '';
  }

  return `
    <line
      class="bond bond--${bond.kind}"
      x1="${formatNumber(bond.from.x)}"
      y1="${formatNumber(bond.from.y)}"
      x2="${formatNumber(bond.to.x)}"
      y2="${formatNumber(bond.to.y)}"
      stroke-width="${formatNumber(width)}"
      opacity="${formatNumber(opacity)}"
      ${dashArray}
    />
  `;
}

function renderArrow(arrow) {
  if (arrow.opacity < 0.04) {
    return '';
  }

  return `
    <path
      class="electron-arrow electron-arrow--${arrow.kind}"
      d="${arrow.path}"
      opacity="${formatNumber(arrow.opacity)}"
      marker-end="url(#arrow-head)"
    />
  `;
}

function renderAtom(atom) {
  return `
    <g class="atom ${atom.className}">
      <circle cx="${formatNumber(atom.x)}" cy="${formatNumber(atom.y)}" r="${atom.radius}" />
      <text x="${formatNumber(atom.x)}" y="${formatNumber(atom.y + 1)}">${atom.symbol}</text>
    </g>
  `;
}

function renderChargeLabel(label) {
  if (!label.text || label.opacity < 0.04) {
    return '';
  }

  return `
    <text
      class="charge-label"
      x="${formatNumber(label.x)}"
      y="${formatNumber(label.y)}"
      opacity="${formatNumber(label.opacity)}"
    >${label.text}</text>
  `;
}

export function renderReactionScene(svgElement, reactionState) {
  svgElement.innerHTML = `
    <defs>
      <filter id="cloud-blur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <marker id="arrow-head" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" class="arrow-head" />
      </marker>
      <radialGradient id="scene-background" cx="50%" cy="44%" r="70%">
        <stop offset="0%" stop-color="#14213d" />
        <stop offset="100%" stop-color="#0b1020" />
      </radialGradient>
    </defs>

    <rect x="0" y="0" width="760" height="460" rx="18" fill="url(#scene-background)" />
    <line class="reaction-axis" x1="92" y1="240" x2="680" y2="240" />

    ${reactionState.electronClouds.map(renderCloud).join('')}
    ${reactionState.bonds.map(renderBond).join('')}
    ${reactionState.arrows.map(renderArrow).join('')}
    ${reactionState.atoms.map(renderAtom).join('')}
    ${reactionState.chargeLabels.map(renderChargeLabel).join('')}
  `;
}
