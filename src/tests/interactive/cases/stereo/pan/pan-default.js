// pan - defaults
// Center panned (equal L/R)
clock(90)
  .seq("c4 e4 g4 c5")
  .apply(s =>
    s.saw()
      .lpf(hz(1500))
      .gain(s.gate.ad({ attack: 0.01, decay: 0.15 }))
      .pan()
      .apply(p => out({ l: p.l, r: p.r })))
