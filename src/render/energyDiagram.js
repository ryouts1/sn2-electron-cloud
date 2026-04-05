function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function drawHighlight(context, x, y, label, color) {
  context.fillStyle = color;
  context.font = '12px Inter, sans-serif';
  context.fillText(label, x, y);
}

export function drawEnergyDiagram(canvas, orbitalEnergies, markers = {}) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  context.fillStyle = '#07101d';
  context.fillRect(0, 0, width, height);

  if (!orbitalEnergies?.length) {
    return;
  }

  const { homoIndex = -1, lumoIndex = -1, donorIndex = -1, acceptorIndex = -1 } = markers;
  const margin = { top: 18, right: 26, bottom: 22, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const energies = orbitalEnergies.map((entry) => entry.energy);
  const energyMin = Math.min(...energies) - 1;
  const energyMax = Math.max(...energies) + 1;
  const mapY = (energy) => margin.top + ((energyMax - energy) / (energyMax - energyMin)) * innerHeight;

  context.strokeStyle = '#294862';
  context.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick += 1) {
    const fraction = tick / 4;
    const energy = energyMin + ((energyMax - energyMin) * fraction);
    const y = mapY(energy);
    context.beginPath();
    context.moveTo(margin.left, y);
    context.lineTo(width - margin.right, y);
    context.stroke();

    context.fillStyle = '#90a4b8';
    context.font = '12px Inter, sans-serif';
    context.fillText(`${round(energy, 1)} eV`, 8, y + 4);
  }

  orbitalEnergies.forEach((entry, index) => {
    const y = mapY(entry.energy);
    const left = margin.left + 14;
    const right = width - margin.right - 18;
    const occupied = entry.occupancy > 0;

    context.strokeStyle = occupied ? '#7dd3fc' : '#94a3b8';
    context.lineWidth = occupied ? 3 : 2;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();

    if (index === donorIndex) {
      drawHighlight(context, right - 50, y - 8, 'donor', '#facc15');
    } else if (index === acceptorIndex) {
      drawHighlight(context, right - 62, y - 8, 'acceptor', '#c084fc');
    } else if (index === homoIndex) {
      drawHighlight(context, right - 44, y - 8, 'HOMO', '#7dd3fc');
    } else if (index === lumoIndex) {
      drawHighlight(context, right - 44, y - 8, 'LUMO', '#f59e0b');
    }
  });
}
