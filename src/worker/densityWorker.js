import { getReactionGeometry, computeBounds } from '../chemistry/reactionPath.js';
import { TOTAL_ELECTRONS, TOTAL_VALENCE_ELECTRONS } from '../chemistry/elements.js';
import { computeReactionSnapshot, sampleFieldOnGrid } from '../physics/sampler.js';

function summarizeOrbitalEnergies(model) {
  return model.orbitalEnergies.map((energy, index) => ({
    index,
    energy,
    occupancy: model.occupancies[index]
  }));
}

self.addEventListener('message', (event) => {
  const {
    requestId,
    progress,
    resolution,
    view,
    basisScale = 1,
    couplingScale = 1.75
  } = event.data;

  try {
    const geometry = getReactionGeometry(progress);
    const bounds = computeBounds(geometry.atoms, 2.4);
    const currentModel = computeReactionSnapshot(geometry, { basisScale, couplingScale });
    const referenceModel = view === 'delta-density'
      ? computeReactionSnapshot(getReactionGeometry(0), { basisScale, couplingScale })
      : null;

    const sampled = sampleFieldOnGrid({
      currentModel,
      referenceModel,
      atoms: geometry.atoms,
      bounds,
      resolution,
      view
    });

    const payload = {
      requestId,
      progress,
      view,
      resolution,
      atoms: geometry.atoms,
      bonds: geometry.bonds,
      metrics: geometry.metrics,
      bounds: sampled.bounds,
      step: sampled.step,
      stats: sampled.stats,
      summary: {
        basisFunctionCount: currentModel.basisFunctions.length,
        valenceElectronCount: TOTAL_VALENCE_ELECTRONS,
        totalElectronCount: TOTAL_ELECTRONS,
        electronCountCheck: currentModel.electronCountCheck,
        charges: currentModel.charges,
        populations: currentModel.populations,
        overlapPopulations: currentModel.overlapPopulations,
        orbitalEnergies: summarizeOrbitalEnergies(currentModel),
        homoIndex: currentModel.homoIndex,
        lumoIndex: currentModel.lumoIndex,
        homoEnergy: currentModel.orbitalEnergies[currentModel.homoIndex],
        lumoEnergy: currentModel.orbitalEnergies[currentModel.lumoIndex],
        gap: currentModel.orbitalEnergies[currentModel.lumoIndex] - currentModel.orbitalEnergies[currentModel.homoIndex]
      },
      positiveField: sampled.positiveField.buffer,
      negativeField: sampled.negativeField.buffer
    };

    self.postMessage(payload, [sampled.positiveField.buffer, sampled.negativeField.buffer]);
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
