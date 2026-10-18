// lpf - modulated resonance
// Resonance sweep with fixed cutoff
saw(hz(110))
  .lpf({ cutoff: hz(800), res: lfo(0.3, 0, 0.8) })
  .out()
