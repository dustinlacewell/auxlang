// notch - all params
// Notch with explicit cutoff and resonance
saw({ freq: 110 }).notch({ cutoff: 440, resonance: 0.8 }).out()
