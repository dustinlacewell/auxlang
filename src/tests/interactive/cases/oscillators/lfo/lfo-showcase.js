// sin as lfo - showcase
// Classic filter sweep with sine LFO
saw(110)
  .lpf({ cutoff: sin(0.25, 200, 2000), resonance: 0.5 })
  .out()
