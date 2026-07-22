// adsr - modulated release
// Release time varies 0.1s to 0.8s
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .adsr({
            attack: 0.01,
            decay: 0.1,
            sustain: 0.5,
            release: lfo(0.15, 0.1, 0.8)}))
      .out())
