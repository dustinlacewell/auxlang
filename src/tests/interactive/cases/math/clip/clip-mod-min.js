// clip - modulated min
// Varying clip floor
sin({ freq: 110 })
  .mult(2)
  .clip({ min: lfo(0.5, -1, 0), max: 1 })
  .out()
