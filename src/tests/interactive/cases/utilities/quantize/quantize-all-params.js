// quantize - all params
// Quantize to A minor pentatonic
lfo(0.3, 200, 600)
  .quantize({
    root: 9,
    octave: 3,
    range: 2,
    scale: "minor pentatonic"})
  .tri()
  .out()
