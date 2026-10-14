// scale - modulated max
// Shrinking pitch range
saw(hz(
  lfo(2)
    .scale({
      from: -1,
      to: 1,
      min: 200,
      max: lfo(0.1, 400, 800)})))
  .out()
