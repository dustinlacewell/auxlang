// sah - all params
// Sample LFO as stepped pitch
clock(120).seq("c4*2").apply(s =>
  sah({ input: sin(3, 200, 800), trig: s.trig }).tri().gain({ level: s.gate.ar() }).out()
)
