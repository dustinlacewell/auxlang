// mixer - all params
// Mix four waveforms at different octaves, each channel at its own level
mixer({
  a: sin({ pitch: hz(110) }),
  b: tri({ pitch: hz(220) }),
  c: saw({ pitch: hz(440) }).lpf({ cutoff: 1000 }),
  d: sqr({ pitch: hz(880) }).gain(0.3)})
  .level({ a: 1, b: 0.8, c: 0.6, d: 1.2 })
  .out()
