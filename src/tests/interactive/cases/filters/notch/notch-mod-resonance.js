// notch - modulated resonance
// Notch width modulation
saw({ freq: 110 })
  .notch({ cutoff: 800, resonance: lfo(0.3, 0.3, 0.9) })
  .out()
