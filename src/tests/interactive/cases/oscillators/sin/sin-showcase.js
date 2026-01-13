// sin - showcase
// FM bell using sine as modulator
clock(60).seq("c5 e5 g5 c6").apply(s =>
  sin(s.cv.add(sin(s.cv.mult(2)).scale({ from: -1, to: 1, min: -50, max: 50 })))
    .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }) })
    .out()
)
