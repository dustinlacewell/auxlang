// Probability Showcase
// Generative melody with varied probabilities
clock(130)
  .seq("c4?0.1 [e4?0.4 g4?0.6] c5?0.25 ~ b4?0.5 g4?0.2 ~ e4?0.7")
  .sin()
  .gain(0.4)
  .delay({ time: 0.2, feedback: 0.5, mix: 0.35 })
  .out()
