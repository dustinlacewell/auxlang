// mult - modulated by
// Tremolo with mult
saw({ freq: 220 }).mult(lfo(4, 0.5, 1)).out()
