// bpf - showcase
// Vowel-like formant on saw
saw({ freq: 110 })
  .bpf({ cutoff: lfo(0.2, 400, 1200), resonance: 0.85 })
  .gain(3)
  .out()
