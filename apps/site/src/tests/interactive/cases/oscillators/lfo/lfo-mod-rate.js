// lfo - modulated rate
// LFO freq modulated by another LFO
sin(hz(lfo(lfo(0.1, 0.5, 4), 200, 400))).out()
