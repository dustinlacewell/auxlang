// add - defaults
// Add LFO wobble to base pitch
sin(add(330).to(lfo(4, -15, 15))).out()
