// poly - showcase
// Poly saw chord with filter sweep
poly([saw({ freq: 110 }), saw({ freq: 138.6 }), saw({ freq: 165 })])
  .lpf(lfo(0.2, 400, 2000), 0.3)
  .gain(0.15)
  .out()
