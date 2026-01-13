// adsr - modulated attack
// Attack time varies 0.01s to 0.5s
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .adsr({
            attack: sin(0.1, 0.01, 0.5),
            decay: 0.1,
            sustain: 0.5,
            release: 0.3}))
      .out())
