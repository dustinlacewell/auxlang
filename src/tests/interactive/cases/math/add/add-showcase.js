// add - showcase
// FM bell using add for modulation
clock(60)
  .seq("c5 e5 g5 c6")
  .apply(s =>
    sin(
      add(s.cv)
        .to(sin(s.cv.mult(2)).mult(80))).gain({
        level: s
          .gate
          .adsr({
            attack: 0.01,
            decay: 0.4,
            sustain: 0,
            release: 0.2})})
      .out())
