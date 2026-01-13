// adsr - showcase
// Dual envelope: filter + amp with different sustain levels
clock(90)
  .seq("c3 ~ e3 ~")
  .apply(s =>
    s.saw()
      .lpf(s.gate.adsr({
        attack: 0.01,
        decay: 0.4,
        sustain: 0.15,
        release: 0.4
      }).scale(100, 4000))
      .gain(s.gate.adsr({
        attack: 0.01,
        decay: 0.2,
        sustain: 0.6,
        release: 0.5
      }))
      .out()
  )
