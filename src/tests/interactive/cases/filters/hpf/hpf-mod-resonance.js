// hpf - modulated resonance
// Resonance modulation on highpass
saw(hz(110))
  .hpf({ cutoff: hz(400), res: lfo(0.2, 0, 0.6) })
  .out()
