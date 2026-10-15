// counter - showcase
// Step sequencer simulation
clock(120)
  .apply(c =>
    counter(c.beat, { length: 8 })
      .scale({
        from: 0,
        to: 8,
        min: 48,
        max: 72})
      .quantize({ scaleName: "major" })
      .saw()
      .lpf({ cutoff: hz(800) })
      .gain(0.3)
      .out())
