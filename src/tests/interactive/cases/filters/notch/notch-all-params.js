// notch - all params
// Notch with explicit cutoff and resonance
saw(hz(110)).notch({ cutoff: hz(440), res: 0.8 }).out()
