// voices - defaults
// Single voice extraction from chord
let s = clock(120).seq("[c3,e3,g3]")
s.lane(0)
  .saw()
  .gain(s.lane(0).gate.ar())
  .out()
