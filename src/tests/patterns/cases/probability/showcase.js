// Probability Showcase
// Generative melody with varied probabilities
clock(130)
  .seq("c4?.9 [e4?.6 g4?.4] c5?.75 ~ b4?.5 g4?.8 ~ e4?.3")
  .sin()
  .gain(0.4)
  .delay({ time: 0.2, feedback: 0.5, mix: 0.35 })
  .out()
