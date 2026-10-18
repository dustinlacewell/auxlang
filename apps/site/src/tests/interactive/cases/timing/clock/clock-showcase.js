// clock - showcase
// Plucky filtered groove at 100 BPM
clock(100)
  .seq("c3 e3 g3 e3")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: hz(800) })
      .gain(s
        .gate
        .adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.1}))
      .out())
