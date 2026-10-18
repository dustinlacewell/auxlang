// quantize - modulated root
// Root drifts across the octave; same noise input, different scale roots audible
noise()
  .quantize({ scaleName: "dorian", root: lfo(0.15, 0, 11) })
  .tri()
  .lpf(84)
  .gain(0.3)
  .out()
