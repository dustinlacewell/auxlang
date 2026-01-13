// bpf - modulated cutoff
// Sweeping bandpass formant
noise().bpf({ cutoff: sin(0.3, 300, 2000), resonance: 0.7 }).gain(3).out()
