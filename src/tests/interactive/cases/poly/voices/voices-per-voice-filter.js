// voices - per-voice filtering
// Each chord tone with progressively brighter filter
let s = clock(60).seq("{c3,e3,g3}")
s.voices[0].saw().lpf(400).gain({ level: s.voices[0].gate.ar() }).out()
s.voices[1].saw().lpf(800).gain({ level: s.voices[1].gate.ar() }).out()
s.voices[2].saw().lpf(1600).gain({ level: s.voices[2].gate.ar() }).out()
