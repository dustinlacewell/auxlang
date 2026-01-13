// quantize - modulated input
// Random frequencies quantized to blues
clock(180).seq("c4*4").apply(s =>
  sah({ input: noise(), trig: s.trig })
    .scale({ from: -1, to: 1, min: 150, max: 600 })
    .quantize({ scale: "blues" })
    .tri()
    .gain({ level: s.gate.ar() })
    .out()
)
