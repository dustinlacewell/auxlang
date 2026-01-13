// bpf - modulated resonance
// Resonance modulation on bandpass
saw(110)
  .bpf({ cutoff: 800, resonance: sin(0.5, 0.3, 0.9) })
  .gain(2)
  .out()
