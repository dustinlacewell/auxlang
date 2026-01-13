// clock - all params
// Slow tempo with swing
clock({ bpm: 80, swing: 0.2 }).seq("c4 e4 g4 e4").apply(s =>
  s.cv.saw().gain({ level: s.gate.ar() }).out()
)
