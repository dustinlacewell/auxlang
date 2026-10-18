// notch - showcase
// Slow phaser sweep
saw(hz(55))
  .notch({ cutoff: hz(lfo(0.1, 100, 2000)), res: 0.85 })
  .out()
