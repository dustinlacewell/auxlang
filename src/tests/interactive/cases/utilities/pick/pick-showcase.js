// pick - showcase
// Mono synth voice
clock(120).seq("c3 e3 g3 c4").apply(s =>
  s.saw()
    .lpf(1200, 0.2)
    .gain({ level: s.gate.adsr() })
    .gain(0.3)
    .out()
)
