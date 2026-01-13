// mix - all params
// Mix four different waveforms at different octaves
mix({
  a: sin(110),
  b: tri(220),
  c: saw(440).lpf({ cutoff: 1000 }),
  d: sqr(880).gain(0.3)})
  .out()
