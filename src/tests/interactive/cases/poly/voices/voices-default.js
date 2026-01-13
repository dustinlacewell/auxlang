// voices - defaults
// Single voice extraction from chord
let s = clock(120).seq("{c3,e3,g3}")
s.voices[0]
  .saw()
  .gain({ level: s.voices[0].gate.ar() })
  .out()
