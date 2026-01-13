// seq - alternate
// Alternating notes with <>
clock(120)
  .seq("<c4 e4> <g4 c5>")
  .apply(s =>
    s.cv
      .tri()
      .gain({ level: s.gate.ar() })
      .out())
