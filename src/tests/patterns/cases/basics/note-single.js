// Single Note
// One note repeating on each beat
clock(120)
  .seq("c4")
  .apply(s=>s
  .sin()
  .gain(s.gate.ad(.1))
  .gain(0.5)
  .out())
