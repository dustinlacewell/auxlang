// swing - modulated amount
// Bar by bar: straight, light shuffle, heavy shuffle, then round again
tempo(120)
const line = p`c4 e4 g4 e4 c4 e4 g4 e4`
const s = seq(p`<${line} ${line.swingBy(0.2, 4)} ${line.swingBy(0.5, 4)}>`)
s.tri()
  .mul(s.gate.ad(0.005, 0.12))
  .gain(0.3)
  .out()
