// adsr - modulated sustain
// Sustain level varies 0.1 to 0.9
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .adsr({
            attack: 0.05,
            decay: 0.15,
            sustain: sin(0.2, 0.1, 0.9),
            release: 0.3}))
      .out())
