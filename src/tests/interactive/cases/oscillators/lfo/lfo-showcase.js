// lfo - showcase
// Classic filter sweep with LFO
saw(hz(110)).lpf({ cutoff: hz(lfo(0.25, 200, 2000)), res: 0.5 }).out()
