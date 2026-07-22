// lpf - all params
// Lowpass with explicit cutoff and resonance
saw({ freq: 110 }).lpf({ cutoff: 500, resonance: 0.5 }).out()
