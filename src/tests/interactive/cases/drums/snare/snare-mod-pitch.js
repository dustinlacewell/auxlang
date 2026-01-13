// snare - modulated pitch
// Snare with varying body pitch
clock(120).seq("~ c4 ~ c4").apply(s =>
  s.trig.snare({ pitch: sin(0.25, 150, 220) }).out()
)
