// swing - defaults
// swing(4): the second eighth of each beat lands late, a triplet shuffle
tempo(120)
const s = seq(p`c4 e4 g4 e4 c4 e4 g4 e4`.swing(4))
s.tri()
  .mul(s.gate.ad(0.005, 0.12))
  .gain(0.3)
  .out()
