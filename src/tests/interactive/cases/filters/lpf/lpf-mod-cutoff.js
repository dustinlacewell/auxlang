// lpf - modulated cutoff
// Classic filter sweep with LFO
saw({ freq: 110 }).lpf({ cutoff: lfo(0.5, 200, 2000) }).out()
