// Polyphony Showcase
// Rich harmonic progression with movement
clock(70)
  .seq("{c4,e4,g4}@2 [e4 g4] {f4,a4,c5} ~ {g4,b4,d5}@2 <{e4,g4,b4} {e4,g#4,b4}>")
  .apply(s => s
  .sin()
  .vca(s.gate))
  .gain(0.3)
  .delay({ time: 0.22, feedback: 0.4, mix: 0.25 })
  .out()
