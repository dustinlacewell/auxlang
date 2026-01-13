// clock - modulated swing
// Varying swing amount
clock({ bpm: 120, swing: sin(0.1, 0, 0.3) }).seq("c4 e4 g4 e4").apply(s =>
  s.cv.saw().gain({ level: s.gate.ar() }).out()
)
