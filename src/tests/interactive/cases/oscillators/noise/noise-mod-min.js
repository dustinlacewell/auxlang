// noise - modulated min
// Noise with LFO-modulated minimum (DC offset sweep)
noise({ min: sin(0.5, -1, 0), max: 1 }).gain(0.3).out()
