// add - defaults
// Add LFO wobble to base pitch
sin(lfo(4, -15, 15).add(330)).out()
