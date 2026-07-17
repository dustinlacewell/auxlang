// swing - showcase
// Funky 16th-note hihat groove with swing
clock(120)
  .swing(0.15)
  .apply(c =>
    c.seq("c4*4")
      .trig
      .hihat({ decay: 0.05 })
      .gain(0.4)
      .out())
