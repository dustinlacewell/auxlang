// bpf - modulated resonance
// Resonance modulation on bandpass
saw(hz(110))
  .bpf({ cutoff: hz(800), res: lfo(0.5, 0.3, 0.9) })
  .gain(2)
  .out()
