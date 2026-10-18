// swing - showcase
// A shuffled groove: swung hats and bass over a straight four-on-the-floor kick
tempo(96)
seq(p`c1*4`).trig.kick().gain(0.7).out()
seq(p`c1*16`.swingBy(0.3, 8)).trig.hihat().gain(2).out()
const b = seq(p`c2 ~ c2 eb2 ~ g1 c2 ~`.swing(4))
b.tri()
  .lpf(72, 0.3)
  .mul(b.gate.ad(0.005, 0.15))
  .gain(0.4)
  .out()
