// fm - modulated ratio
// LFO sweeps ratio 1 to 3 - timbre drifts from harmonic to clangy and back
fm({ freq: 220, index: 4, ratio: lfo(0.2, 1, 3) }).gain(0.3).out()
