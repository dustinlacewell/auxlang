// lpf - modulated cutoff
// Classic filter sweep with LFO
saw(hz(110)).lpf({ cutoff: hz(lfo(0.5, 200, 2000)) }).out()
