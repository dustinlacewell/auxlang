// Slide Showcase
// A legato line: slid notes glide in without a new attack; the notes after a rest attack again
clock(100)
  .seq("c4_e4_g4 ~ c5_b4 g4_e4 ~ c4")
  .apply(s => s
    .slew(s.slide.mul(0.03), s.slide.mul(0.03))
    .sin()
    .vca(s.gate.ar(0.005, 0.15))
    .gain(0.4)
    .delay({ time: 0.25, feedback: 0.35, mix: 0.3 })
    .out())
