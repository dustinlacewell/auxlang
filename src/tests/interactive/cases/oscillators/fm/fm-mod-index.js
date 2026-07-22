// fm - modulated index
// LFO sweeps index 0 to 8 - clean sine growing into a bright bell and back
fm({ freq: 220, index: lfo(0.2, 0, 8) }).gain(0.3).out()
