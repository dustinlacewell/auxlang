// notch - modulated resonance
// Notch width modulation
saw(110)
  .notch({ cutoff: 800, resonance: sin(0.3, 0.3, 0.9) })
  .out()
