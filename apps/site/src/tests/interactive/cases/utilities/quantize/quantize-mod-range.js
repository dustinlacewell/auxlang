// quantize - modulated range
// Playable band narrows to one octave then widens to four
noise()
  .quantize({ scaleName: "minor pentatonic", range: lfo(0.2, 1, 4) })
  .tri()
  .lpf(84)
  .gain(0.3)
  .out()
