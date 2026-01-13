// sah - defaults
// Sample noise as pitch CV
clock(120).seq("c4*4").apply(s =>
  sah({ input: noise(), trig: s.trig }).scale({ from: -1, to: 1, min: 200, max: 800 }).tri().gain({ level: s.gate.ar() }).out()
)
