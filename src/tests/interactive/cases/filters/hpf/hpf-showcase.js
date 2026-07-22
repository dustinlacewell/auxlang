// hpf - showcase
// Filtered hihat with sweep
clock(240)
  .seq("c4*4")
  .apply(s =>
    s.trig
      .hihat()
      .hpf({ cutoff: lfo(0.25, 2000, 10000) })
      .out())
