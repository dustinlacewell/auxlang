// lfo - modulated min
// LFO with modulated minimum (rising floor)
sin(hz(lfo({ freq: 2, min: lfo(0.1, 100, 300), max: 500 }))).out()
