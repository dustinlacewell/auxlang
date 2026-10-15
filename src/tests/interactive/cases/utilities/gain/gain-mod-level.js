// gain - modulated level
// Tremolo effect with LFO
saw(hz(220)).gain(lfo(4, 0.3, 1)).out()
