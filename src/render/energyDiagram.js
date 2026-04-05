function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function drawEnergyDiagram(canvas, orbitalEnergies, homoIndex, lumoIndex) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  context.fillStyle = '#07101d';
  context.fillRect(0, 0, width, height);

  if (!orbitalEnergies?.length) {
    return;
  }

  const margin = { top: 18, right: 22, bottom: 22, left: 48 };
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
    const right = width - margin.right - 14;
    const occupied = entry.occupancy > 0;

    context.strokeStyle = occupied ? '#7dd3fc' : '#94a3b8';
    context.lineWidth = occupied ? 3 : 2;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();

    if (index === homoIndex || index === lumoIndex) {
      context.fillStyle = index === homoIndex ? '#7dd3fc' : '#f59e0b';
      context.font = '12px Inter, sans-serif';
      context.fillText(index === homoIndex ? 'HOMO' : 'LUMO', right - 44, y - 6);
    }
  });
}
