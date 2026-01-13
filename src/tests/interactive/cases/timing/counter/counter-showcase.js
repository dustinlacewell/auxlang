// counter - showcase
// Step sequencer simulation
clock(120).apply(c =>
  counter(c).max(8).scale({ from: 0, to: 8, min: 100, max: 500 })
    .quantize({ scale: "major" })
    .saw()
    .lpf({ cutoff: 800 })
    .gain(0.3)
    .out()
)
