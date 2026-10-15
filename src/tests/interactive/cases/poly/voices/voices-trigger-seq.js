// voices - trigger seq
// Melody with root note triggering kick fill
let s = clock(120).seq("[c3@4,[c4 e4 g4 e4]]")
s.saw()
  .lpf(hz(800))
  .gain(s.gate.ar())
  .gain(0.3)
  .out()
s.lane(0)
  .trig
  .kick()
  .gain(0.6)
  .out()
