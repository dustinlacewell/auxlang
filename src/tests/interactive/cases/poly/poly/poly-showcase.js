// poly - showcase
// Poly saw chord with filter sweep
poly([saw(110), saw(138.6), saw(165)])
  .lpf(sin(0.2, 400, 2000), 0.3)
  .gain(0.15)
  .out()
