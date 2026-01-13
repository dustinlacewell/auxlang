// seq - showcase
// Complex pattern with multiple features
clock(120).seq("[c4 e4]*2 g4@2 <c5 b4>").apply(s =>
  s.cv.tri().lpf({ cutoff: 1500 }).gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 }) }).out()
)
