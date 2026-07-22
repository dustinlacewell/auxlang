// phaser - showcase
// Slow swirling phaser over a droning pad
clock(70)
const s = seq("{c3,e3,g3}")
s.tri()
  .phaser({ rate: 0.15, depth: 0.85, feedback: 0.4, mix: 0.6 })
  .gain(s.gate.ad(0.3, 0.5))
  .out()
