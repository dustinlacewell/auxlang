// counter - all params
// Counts beats, wraps every 4: a rising 4-note loop
clock(120)
  .apply(c =>
    counter(c.beat, { length: 4 })
      .scale({
        from: 0,
        to: 4,
        min: 55,
        max: 75})
      .saw()
      .gain(0.3)
      .out())
