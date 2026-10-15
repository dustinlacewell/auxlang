// bpf - modulated cutoff
// Sweeping bandpass formant
noise()
  .bpf({ cutoff: hz(lfo(0.3, 300, 2000)), res: 0.7 })
  .gain(3)
  .out()
