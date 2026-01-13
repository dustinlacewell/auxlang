// voices - defaults
// Single voice extraction from chord
s
  .voices
  .undefined
  .saw()
  .gain({ level: s.voices.undefined.gate.ar() })
  .out()
