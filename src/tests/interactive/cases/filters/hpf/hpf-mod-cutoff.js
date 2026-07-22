// hpf - modulated cutoff
// Highpass sweep with LFO
saw({ freq: 110 }).hpf({ cutoff: lfo(0.5, 100, 800) }).out()
