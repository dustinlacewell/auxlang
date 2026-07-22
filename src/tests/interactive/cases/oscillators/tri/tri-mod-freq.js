// tri - modulated freq
// Triangle with LFO-modulated frequency
tri({ freq: lfo(0.5, 200, 400) }).out()
