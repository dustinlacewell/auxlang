// notch - showcase
// Slow phaser sweep
saw({ freq: 55 })
  .notch({ cutoff: lfo(0.1, 100, 2000), resonance: 0.85 })
  .out()
