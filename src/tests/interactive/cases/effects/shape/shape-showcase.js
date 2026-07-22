// shape - showcase
// Bass line pushed into heavy saturation for a gritty, distorted growl
clock(90)
const s = seq("c2 ~ c2 eb2 ~ c2 g1 ~")
s.tri()
  .shape(0.8)
  .gain(s.gate.ad(0.005, 0.15))
  .out()
