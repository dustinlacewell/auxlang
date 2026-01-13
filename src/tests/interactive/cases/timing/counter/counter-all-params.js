// counter - all params
// Counter with max wrap
clock(120)
  .apply(c =>
    counter(c).max(4)
      .scale({
        from: 0,
        to: 4,
        min: 200,
        max: 600})
      .saw()
      .gain(0.3)
      .out())
