// fm - showcase
// Plucky FM bell sequence, index snapping down on each envelope
clock(90)
const s = seq("c4 e4 g4 c5")
s.pitch
  .fm({ index: s.gate.ad(0.005, 0.3).mul(5), ratio: 1.5 })
  .gain(s.gate.ad(0.005, 0.3))
  .out()
