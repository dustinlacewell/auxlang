// poly - modulated voices
// Poly voices with individual LFO modulation
poly([
  sin(sin(0.5, 200, 300)),
  sin(sin(0.7, 300, 400)),
  sin(sin(0.9, 400, 500))
]).gain(0.15).out()
