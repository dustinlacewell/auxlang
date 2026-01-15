// Groups Showcase
// Complex rhythmic pattern with groups and alternation
clock(90)
  .seq("[c4 e4 g4] <c5 b4> [g4 ~ e4] <d4 eb4>")
  .sin()
  .gain(0.4)
  .delay({ time: 0.18, feedback: 0.4, mix: 0.25 })
  .out()
