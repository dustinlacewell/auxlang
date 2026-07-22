// bpf - modulated resonance
// Resonance modulation on bandpass
saw({ freq: 110 })
  .bpf({ cutoff: 800, resonance: lfo(0.5, 0.3, 0.9) })
  .gain(2)
  .out()
