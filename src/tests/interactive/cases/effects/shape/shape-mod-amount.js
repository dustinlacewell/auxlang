// shape - modulated amount
// LFO sweeps amount 0 to 1 - clean sine grows into heavy fuzz and back
sin({ freq: 220 }).shape(lfo(0.2, 0, 1)).gain(0.3).out()
