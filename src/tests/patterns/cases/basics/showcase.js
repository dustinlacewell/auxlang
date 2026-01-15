// Basics Showcase
// Melodic phrase with accidentals and rests
clock(140)
  .seq("c4 ~ eb4 f4 ~ g4 bb4 c5")
  .apply(s=>s
  .sin()
  .gain(s.gate.adsr())
  .gain(0.4)
  .delay({ time: 0.2, feedback: 0.3, mix: 0.25 })
  .out())
