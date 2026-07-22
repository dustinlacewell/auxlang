// lpf - modulated resonance
// Resonance sweep with fixed cutoff
saw({ freq: 110 })
  .lpf({ cutoff: 800, resonance: lfo(0.3, 0, 0.8) })
  .out()
