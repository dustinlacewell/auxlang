// adsr - all params
// All params specified - low sustain level
clock(60)
  .seq("c4 ~ c4 ~")
  .apply(s =>
    s.saw()
      .lpf(1500)
      .gain(
        s
          .gate
          .adsr({
            attack: 0.1,
            decay: 0.2,
            sustain: 0.3,
            release: 0.4}))
      .out())
