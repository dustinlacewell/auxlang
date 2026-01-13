// counter - defaults
// Count beats
clock(120)
  .apply(c =>
    counter(c).scale({
        from: 0,
        to: 8,
        min: 200,
        max: 800})
      .saw()
      .gain(0.3)
      .out())
