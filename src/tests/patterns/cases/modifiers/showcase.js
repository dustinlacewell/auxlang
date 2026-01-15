// Modifiers Showcase
// Rhythmic pattern using all modifier types
clock(100)
  .seq("c4*3 ~ e4@2 g4!2 c5*2 ~")
  .sin()
  .gain(0.4)
  .delay({ time: 0.15, feedback: 0.35, mix: 0.3 })
  .out()
