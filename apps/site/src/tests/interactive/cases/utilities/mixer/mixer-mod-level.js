// mixer - modulated level
// Mix sequenced synth with a noise texture; an LFO fades the noise channel in and out
clock(60)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    mixer({
      a: s.tri().gain(s.gate.adsr()),
      b: noise().lpf({ cutoff: hz(500) })})
      .mod("level.b", lfo(0.2, 0, 1), 1)
      .out())
