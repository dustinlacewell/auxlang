// scale - all params
// Map LFO to frequency range
saw(
  sin()
    .scale({
      from: -1,
      to: 1,
      min: 200,
      max: 800}))
  .out()
