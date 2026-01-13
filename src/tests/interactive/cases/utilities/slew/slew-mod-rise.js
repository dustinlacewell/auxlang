// slew - modulated rise
// Varying portamento speed
clock(120).seq("c4 e4 g4 c5").apply(s =>
  s.cv.slew({ rise: sin(0.25, 0.01, 0.2), fall: 0.1 }).saw().out()
)
