// hihat - modulated decay
// Open/closed hi-hat pattern
clock(120).seq("c4*4").apply(s =>
  s.trig.hihat({ decay: sin(0.5, 0.03, 0.2) }).out()
)
