// lpf - all params
// Lowpass with explicit cutoff and resonance
saw(hz(110)).lpf({ cutoff: hz(500), res: 0.5 }).out()
