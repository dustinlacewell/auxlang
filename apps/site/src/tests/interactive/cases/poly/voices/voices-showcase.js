// voices - showcase
// Sub bass + pad + arp from single pattern
let s = clock(100).seq("[c2,[c3 <[g3 g4] g3>],[c4 e4 g4 b4]]")

s.lane(0).sin().gain(0.5).out()

s.lane(1)
  .apply(v=>v
  .tri()
  .lpf(hz(600))
  .gain(v.gate.adsr())
  .gain(0.25)
  .out())

s.lane(2)
  .apply(v=>v
  .saw()
  .lpf(hz(lfo(0.3, 800, 2000)))
  .gain(v.gate.adsr())
  .delay({
    time: 0.125,
    feedback: 0.4,
    mix: 0.3})
  .gain(0.2)
  .out())
