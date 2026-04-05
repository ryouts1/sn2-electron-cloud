export const ELEMENTS = {
  H: {
    symbol: 'H',
    valenceElectrons: 1,
    color: '#f8fafc',
    covalentRadius: 0.31,
    renderRadius: 0.18,
    basis: {
      s: { exponent: 1.15, onsiteEnergy: -13.6, principalQuantumNumber: 1 }
    },
    coreDensity: []
  },
  C: {
    symbol: 'C',
    valenceElectrons: 4,
    color: '#d8e0ea',
    covalentRadius: 0.76,
    renderRadius: 0.28,
    basis: {
      s: { exponent: 1.55, onsiteEnergy: -21.4, principalQuantumNumber: 2 },
      p: { exponent: 1.32, onsiteEnergy: -11.4, principalQuantumNumber: 2 }
    },
    coreDensity: [
      { electrons: 2, exponent: 18.0 }
    ]
  },
  O: {
    symbol: 'O',
    valenceElectrons: 6,
    color: '#ff8f8f',
    covalentRadius: 0.66,
    renderRadius: 0.30,
    basis: {
      s: { exponent: 2.30, onsiteEnergy: -32.3, principalQuantumNumber: 2 },
      p: { exponent: 1.95, onsiteEnergy: -14.8, principalQuantumNumber: 2 }
    },
    coreDensity: [
      { electrons: 2, exponent: 28.0 }
    ]
  },
  Cl: {
    symbol: 'Cl',
    valenceElectrons: 7,
    color: '#a5f3b5',
    covalentRadius: 1.02,
    renderRadius: 0.36,
    basis: {
      s: { exponent: 1.55, onsiteEnergy: -25.3, principalQuantumNumber: 3 },
      p: { exponent: 1.18, onsiteEnergy: -13.0, principalQuantumNumber: 3 }
    },
    coreDensity: [
      { electrons: 10, exponent: 14.0 }
    ]
  }
};

export const TOTAL_VALENCE_ELECTRONS = 22;
export const TOTAL_ELECTRONS = 36;
