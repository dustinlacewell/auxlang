// voices - per-voice filtering
// Each chord tone with progressively brighter filter
s
  .voices
  .undefined
  .saw()
  .lpf(400)
  .gain({ level: s.voices.undefined.gate.ar() })
  .out()

s
  .voices
  .undefined
  .saw()
  .lpf(800)
  .gain({ level: s.voices.undefined.gate.ar() })
  .out()

s
  .voices
  .undefined
  .saw()
  .lpf(1600)
  .gain({ level: s.voices.undefined.gate.ar() })
  .out()
