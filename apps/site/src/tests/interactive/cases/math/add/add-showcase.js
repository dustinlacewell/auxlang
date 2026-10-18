// add - showcase
// FM bell using add for modulation
clock(60)
  .seq("c5 e5 g5 c6")
  .apply(s =>
    sin(hz(
      s
        .semis2hz()
        .add(sin(s.add(12)).mul(80))))
      .gain(s
        .gate
        .adsr({
          attack: 0.01,
          decay: 0.4,
          sustain: 0,
          release: 0.2}))
      .out())
