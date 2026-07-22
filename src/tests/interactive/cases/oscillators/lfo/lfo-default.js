// lfo - default
// LFO at default 1Hz modulating a sine's Hz range 300-500
sin({ freq: lfo(1, 300, 500) }).out()
