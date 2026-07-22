// saw - modulated freq
// Sawtooth with LFO-modulated frequency
saw({ freq: lfo(2, 200, 400) }).out()
