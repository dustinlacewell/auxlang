// hpf - modulated cutoff
// Highpass sweep with LFO
saw(hz(110)).hpf({ cutoff: hz(lfo(0.5, 100, 800)) }).out()
