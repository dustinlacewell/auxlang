// chord - showcase
// Chord progression from sequencer
clock(30)
  .seq("c3 f3 g3 c3")
  .apply(s =>
    s.cv
      .chord("maj7")
      .tri()
      .lpf({ cutoff: 800 })
      .gain({ level: s.gate.adsr({ attack: 0.2, release: 0.5 }) })
      .spread()
      .out())
