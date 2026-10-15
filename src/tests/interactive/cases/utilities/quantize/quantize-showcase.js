// quantize - showcase
// Generative melody in dorian mode
clock(120)
  .seq("c4*8")
  .apply(s =>
    lfo(3, 150, 500)
      .sah(s.trig)
      .quantize({ scaleName: "dorian", root: 2 })
      .tri()
      .lpf({ cutoff: hz(1500) })
      .gain(s.gate.ar({ attack: 0.01, release: 0.1 }))
      .out())
