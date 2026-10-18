// kick - modulated pitch
// Kick with rising pitch per beat
clock(120)
  .seq("c4 c4 c4 c4")
  .apply(s =>
    s.trig
      .kick({ pitch: lfo(0.25, 40, 80) })
      .out())
