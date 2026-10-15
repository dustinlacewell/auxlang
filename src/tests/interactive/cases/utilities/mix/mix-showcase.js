// mix - showcase
// Layered pad with filtered saw and pure sine
tempo(60)
const s = seq("[c3,e3,g3]")
const padSaw = s.saw().lpf(hz(600))
const padSin = s.sin()
padSaw
  .add(padSin)
  .gain(s.gate.adsr({ attack: 0.2, release: 0.5 }))
  .mix()
  .gain(0.3)
  .out()
