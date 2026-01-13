// clockDiv - modulated by
// Varying division creates polyrhythm
clock(240).apply(c =>
  mix({
    a: c.seq("c5 e5 g5 c6").apply(s => s.cv.tri().gain({ level: s.gate.ar() })),
    b: clockDiv(c).by(sin(0.1, 2, 6)).seq("c3").apply(s => s.cv.sin().gain({ level: s.gate.ar({ release: 0.2 }) }))
  }).out()
)
