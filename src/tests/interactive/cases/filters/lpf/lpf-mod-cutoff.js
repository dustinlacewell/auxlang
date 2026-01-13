// lpf - modulated cutoff
// Classic filter sweep with LFO
saw(110).lpf({ cutoff: sin(0.5, 200, 2000) }).out()
