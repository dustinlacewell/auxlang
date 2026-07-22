// gain - modulated level
// Tremolo effect with LFO
saw({ freq: 220 }).gain({ level: lfo(4, 0.3, 1) }).out()
