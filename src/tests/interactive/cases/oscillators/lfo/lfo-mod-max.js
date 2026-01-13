// sin as lfo - modulated max
// Sine with modulated maximum (shrinking range)
saw(sin({ freq: 2, min: 200, max: sin(0.2, 300, 600) })).out()
