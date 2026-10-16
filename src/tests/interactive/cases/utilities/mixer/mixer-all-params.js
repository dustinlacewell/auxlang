// mixer - all params
// Mix four waveforms at different octaves, each channel at its own level
mixer({
  a: sin({ freq: 110 }),
  b: tri({ freq: 220 }),
  c: saw({ freq: 440 }).lpf({ cutoff: 1000 }),
  d: sqr({ freq: 880 }).gain(0.3)})
  .level({ a: 1, b: 0.8, c: 0.6, d: 1.2 })
  .out()
