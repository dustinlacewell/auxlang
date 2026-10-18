// counter - defaults
// Count beats: pitch climbs one semitone per beat, never wraps
clock(120)
  .apply(c =>
    counter(c.beat)
      .scale({
        from: 0,
        to: 12,
        min: 48,
        max: 60})
      .saw()
      .gain(0.3)
      .out())
