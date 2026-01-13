// kick - modulated decay
// Kick with varying decay
clock(120).seq("c4 c4 c4 c4").apply(s =>
  s.trig.kick({ decay: sin(0.5, 0.1, 0.5) }).out()
)
