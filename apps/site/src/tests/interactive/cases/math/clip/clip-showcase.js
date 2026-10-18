// clip - showcase
// Soft-to-hard distortion
clock(120)
  .seq("c2 c2 eb2 g2")
  .apply(s =>
    s
      .saw()
      .mul(lfo(0.25, 1, 4))
      .clip({ min: -0.8, max: 0.8 })
      .lpf(hz(500))
      .gain(s.gate.adsr())
      .out())
