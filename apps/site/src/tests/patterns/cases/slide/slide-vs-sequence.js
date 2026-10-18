// Slide vs Sequence
// The first half is one attack sliding through c4 e4 g4; the second half attacks each note
clock(120)
  .seq("c4_e4_g4 c4 e4 g4")
  .apply(s => s
    .sin()
    .vca(s.gate.ar(0.01, 0.01))
    .gain(0.5)
    .out())
