// pick - modulated input
// Pick from modulated source
sin({ freq: lfo(0.5, 300, 500) }).gain(0.3).out()
