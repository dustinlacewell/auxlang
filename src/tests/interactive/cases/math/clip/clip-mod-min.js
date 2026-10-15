// clip - modulated min
// Varying clip floor
sin(hz(110))
  .mul(2)
  .clip({ min: lfo(0.5, -1, 0), max: 1 })
  .out()
