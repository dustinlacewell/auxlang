// scale - defaults
// Map LFO from [-1,1] to [0,1]
saw({
  freq: lfo()
    .scale()
    .scale({
      from: 0,
      to: 1,
      min: 200,
      max: 400})})
  .out()
