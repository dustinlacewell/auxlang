// voices - trigger seq
// Melody with root note triggering kick fill
s
  .saw()
  .lpf(800)
  .gain({ level: s.gate.ar() })
  .gain(0.3)
  .out()

seq("c4!4")
  .clk(s.voices.undefined.gate)
  .trig
  .kick()
  .gain(0.6)
  .out()
