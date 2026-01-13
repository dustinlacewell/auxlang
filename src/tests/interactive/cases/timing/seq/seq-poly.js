// seq - poly
// Polyphonic chord pattern
clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr() }).out()
)
