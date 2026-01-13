// seq - elongate
// Held notes with @
clock(120).seq("c4@4 e4@2 g4 c5").apply(s =>
  s.cv.tri().gain({ level: s.gate.adsr({ attack: 0.1, release: 0.3 }) }).out()
)
