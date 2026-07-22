// poly - modulated voices
// Poly voices with individual LFO modulation
poly([
  sin({ freq: lfo(0.5, 200, 300) }),
  sin({ freq: lfo(0.7, 300, 400) }),
  sin({ freq: lfo(0.9, 400, 500) })
])
  .gain(0.15)
  .out()
