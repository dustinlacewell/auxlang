// seq - replicate
// Repeated notes with ! (4 separate beats)
clock(120)
  .seq("c4!4 e4!2 g4!2")
  .apply(s =>
    s.cv
      .tri()
      .gain({ level: s.gate.ar() })
      .out())
