// lfo - showcase
// Classic filter sweep with LFO
saw({ freq: 110 }).lpf({ cutoff: lfo(0.25, 200, 2000), resonance: 0.5 }).out()
