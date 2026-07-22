// add - all params
// Add two LFOs for complex modulation
sin(add(lfo(0.5, 300, 400)).to(lfo(6, -30, 30))).out()
