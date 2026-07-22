// nativeReverb - showcase
// Ambient pad with lush reverb
clock(40)
  .seq("{c3,e3,g3} {d3,f3,a3}")
  .apply(s =>
    s.tri()
      .lpf(lfo(0.05, 400, 1200), 0.1)
      .gain({
        level: s
          .gate
          .adsr({
            attack: 0.3,
            decay: 0.2,
            sustain: 0.6,
            release: 1.0})})
      .nativeReverb({
        room: 0.85,
        damp: 0.4,
        wet: 0.6,
        dry: 0.4})
      .gain(0.25)
      .out())
