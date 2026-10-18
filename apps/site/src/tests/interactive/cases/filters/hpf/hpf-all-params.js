// hpf - all params
// Highpass with explicit cutoff and resonance
saw(hz(110)).hpf({ cutoff: hz(500), res: 0.3 }).out()
