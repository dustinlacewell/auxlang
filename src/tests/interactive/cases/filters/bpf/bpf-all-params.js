// bpf - all params
// Bandpass with explicit cutoff and resonance
noise().bpf({ cutoff: hz(800), res: 0.8 }).gain(3).out()
