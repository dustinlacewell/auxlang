// tri - modulated freq
// Triangle with slow LFO modulation
tri({ freq: lfo(0.2, 200, 300) }).out()
