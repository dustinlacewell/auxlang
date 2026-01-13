// scale - showcase
// LFO controlling filter cutoff
saw(110)
  .lpf({
    cutoff: sin(0.5)
      .scale({
        from: -1,
        to: 1,
        min: 200,
        max: 2000})})
  .out()
