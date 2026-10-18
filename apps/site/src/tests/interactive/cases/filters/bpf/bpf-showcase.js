// bpf - showcase
// Vowel-like formant on saw
saw(hz(110))
  .bpf({ cutoff: hz(lfo(0.2, 400, 1200)), res: 0.85 })
  .gain(3)
  .out()
