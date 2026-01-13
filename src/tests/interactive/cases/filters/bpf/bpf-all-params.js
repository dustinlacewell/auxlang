// bpf - all params
// Bandpass with explicit cutoff and resonance
noise().bpf({ cutoff: 800, resonance: 0.8 }).gain(3).out()
