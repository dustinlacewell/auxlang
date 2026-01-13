// sin as lfo - modulated min
// Sine with modulated minimum (rising floor)
saw(sin({ freq: 2, min: sin(0.1, 100, 300), max: 500 })).out()
