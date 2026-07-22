// fm - all params
// 220Hz carrier, ratio 2 (harmonic), high index for a bright bell
fm({ freq: 220, index: 6, ratio: 2 }).gain(0.3).out()
