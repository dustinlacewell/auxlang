// lfo - modulated max
// LFO with modulated maximum (shrinking range)
sin({ freq: lfo({ freq: 2, min: 200, max: lfo(0.2, 300, 600) }) }).out()
