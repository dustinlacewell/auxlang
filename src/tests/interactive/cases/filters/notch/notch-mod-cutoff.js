// notch - modulated cutoff
// Phaser-like effect with sweeping notch
saw({ freq: 110 })
  .notch({ cutoff: lfo(0.2, 300, 1500), resonance: 0.7 })
  .out()
