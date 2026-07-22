// hpf - modulated resonance
// Resonance modulation on highpass
saw({ freq: 110 })
  .hpf({ cutoff: 400, resonance: lfo(0.2, 0, 0.6) })
  .out()
