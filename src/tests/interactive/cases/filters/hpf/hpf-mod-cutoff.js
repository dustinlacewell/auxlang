// hpf - modulated cutoff
// Highpass sweep with LFO
saw(110).hpf({ cutoff: sin(0.5, 100, 800) }).out()
