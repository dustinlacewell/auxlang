// gain - modulated level
// Tremolo effect with LFO
saw(220).gain({ level: sin(4, 0.3, 1) }).out()
