// lfo - all params
// LFO with explicit freq, min, max modulating a sine's Hz range
sin({ freq: lfo({ freq: 2, min: 200, max: 400 }) }).out()
