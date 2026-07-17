// Tie With Rest
// Tied notes separated by rests
clock(120)
  .seq("c4_e4 ~ g4_c5 ~")
  .apply(s=>s
  .slew(s.trig.alt(0.002, 0.01), 0)
  .sin()
  .vca(s.gate))
  .out()
