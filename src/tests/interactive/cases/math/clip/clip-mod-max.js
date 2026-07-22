// clip - modulated max
// Varying clip ceiling
sin({ freq: 110 })
  .mult(2)
  .clip({ min: -1, max: lfo(0.5, 0.3, 1) })
  .out()
