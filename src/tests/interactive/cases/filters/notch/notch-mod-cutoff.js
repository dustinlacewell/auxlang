// notch - modulated cutoff
// Phaser-like effect with sweeping notch
saw(hz(110))
  .notch({ cutoff: hz(lfo(0.2, 300, 1500)), res: 0.7 })
  .out()
