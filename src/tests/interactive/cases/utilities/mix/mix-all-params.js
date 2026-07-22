// mix - all params
// Mix four different waveforms at different octaves
mix({
  a: sin({ freq: 110 }),
  b: tri({ freq: 220 }),
  c: saw({ freq: 440 }).lpf({ cutoff: 1000 }),
  d: sqr({ freq: 880 }).gain(0.3)})
  .out()
