// sin - modulated freq
// Sine with LFO-modulated frequency
sin({ freq: lfo(0.5, 200, 400) }).out()
