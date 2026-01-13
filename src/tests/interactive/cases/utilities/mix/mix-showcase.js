// mix - showcase
// Layered pad with filtered saw and pure sine
clock(60)
  .seq("{c3,e3,g3}")
  .apply(s =>
    mix({ a: s.cv.saw().lpf({ cutoff: 600 }), b: s.cv.sin() }).gain({ level: s.gate.adsr({ attack: 0.2, release: 0.5 }) })
      .out())
