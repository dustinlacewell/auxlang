// clock - showcase
// Funky swing groove
clock({ bpm: 100, swing: 0.15 }).seq("c3 e3 g3 e3").apply(s =>
  s.cv.saw().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }) }).out()
)
