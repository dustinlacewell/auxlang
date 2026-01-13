// hihat - modulated tone
// Hi-hat brightness sweep
clock(120).seq("c4*4").apply(s =>
  s.trig.hihat({ tone: sin(0.25, 0.3, 0.9) }).out()
)
