// clip - modulated max
// Varying clip ceiling
sin(hz(110))
  .mul(2)
  .clip({ min: -1, max: lfo(0.5, 0.3, 1) })
  .out()
