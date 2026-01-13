// mix - modulated input
// Mix sequenced synth with subtle noise texture
clock(60).seq("c4 e4 g4 c5").apply(s =>
  mix({
    a: s.cv.tri().gain({ level: s.gate.adsr() }),
    b: noise().lpf({ cutoff: 500 }).gain(0.05)
  }).out()
)
