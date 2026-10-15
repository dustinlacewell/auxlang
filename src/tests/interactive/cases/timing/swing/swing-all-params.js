// swing - all params
// swingBy(0.2, 4): a light shuffle, each off-beat eighth a little late
tempo(120)
const s = seq(p`c4 e4 g4 e4 c4 e4 g4 e4`.swingBy(0.2, 4))
s.tri()
  .mul(s.gate.ad(0.005, 0.12))
  .gain(0.3)
  .out()
