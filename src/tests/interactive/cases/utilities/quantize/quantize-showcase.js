// quantize - showcase
// Noise quantized to a drifting window: root, octave and range all in motion
noise()
  .quantize({
    scaleName: "dorian",
    root: lfo(0.07, 0, 11),
    octave: lfo(0.13, 2, 4),
    range: lfo(0.09, 1, 3)})
  .tri()
  .lpf({ cutoff: hz(1500) })
  .gain(0.3)
  .out()
