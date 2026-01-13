// lpf - modulated resonance
// Resonance sweep with fixed cutoff
saw(110).lpf({ cutoff: 800, resonance: sin(0.3, 0, 0.8) }).out()
