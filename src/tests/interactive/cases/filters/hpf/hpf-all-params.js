// hpf - all params
// Highpass with explicit cutoff and resonance
saw(110).hpf({ cutoff: 500, resonance: 0.3 }).out()
