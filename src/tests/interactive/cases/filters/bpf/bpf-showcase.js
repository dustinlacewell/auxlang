// bpf - showcase
// Vowel-like formant on saw
saw(110)
  .bpf({ cutoff: sin(0.2, 400, 1200), resonance: 0.85 })
  .gain(3)
  .out()
