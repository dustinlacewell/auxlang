// hpf - modulated resonance
// Resonance modulation on highpass
saw(110)
  .hpf({ cutoff: 400, resonance: sin(0.2, 0, 0.6) })
  .out()
