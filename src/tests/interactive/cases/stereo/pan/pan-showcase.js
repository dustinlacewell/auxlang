// pan - showcase
// Ping-pong delay with alternating pan
clock(120)
  .seq("c4 ~ e4 ~ g4 ~ c5 ~")
  .apply(s =>
    s.saw()
      .lpf(hz(1200))
      .gain(s.gate.ad({ attack: 0.005, decay: 0.1 }))
      .pan(lfo(0.5, -0.8, 0.8))
      .apply(p => out({
        l: p.l.delay({ time: 0.15, feedback: 0.4, mix: 0.35 }),
        r: p.r.delay({ time: 0.15, feedback: 0.4, mix: 0.35 })})))
