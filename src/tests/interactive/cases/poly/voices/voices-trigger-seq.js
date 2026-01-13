// voices - trigger seq
// Melody with root note triggering kick fill
let s = clock(120).seq("{c3@4,[c4 e4 g4 e4]}")
s.saw()
  .lpf(800)
  .gain({ level: s.gate.ar() })
  .gain(0.3)
  .out()
seq("c4!4")
  .clk(s.voices[0].gate)
  .trig
  .kick()
  .gain(0.6)
  .out()
