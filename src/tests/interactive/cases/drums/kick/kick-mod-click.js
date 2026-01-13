// kick - modulated click
// Kick with varying click amount
clock(120).seq("c4 c4 c4 c4").apply(s =>
  s.trig.kick({ click: sin(0.5, 0, 0.8) }).out()
)
