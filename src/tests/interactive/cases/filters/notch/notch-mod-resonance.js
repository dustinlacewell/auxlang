// notch - modulated resonance
// Notch width modulation
saw(hz(110))
  .notch({ cutoff: hz(800), res: lfo(0.3, 0.3, 0.9) })
  .out()
