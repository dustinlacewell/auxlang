// clip - showcase
// Soft-to-hard distortion
clock(120)
  .seq("c2 c2 eb2 g2")
  .apply(s =>
    s.cv
      .saw()
      .mult(lfo(0.25, 1, 4))
      .clip({ min: -0.8, max: 0.8 })
      .lpf({ cutoff: 500 })
      .gain({ level: s.gate.adsr() })
      .out())
