// quantize - showcase
// Generative melody in dorian mode
clock(120).seq("c4*8").apply(s =>
  sah({ input: sin(3, 150, 500), trig: s.trig })
    .quantize({ scale: "dorian", root: 2 })
    .tri()
    .lpf({ cutoff: 1500 })
    .gain({ level: s.gate.ar({ attack: 0.01, release: 0.1 }) })
    .out()
)
