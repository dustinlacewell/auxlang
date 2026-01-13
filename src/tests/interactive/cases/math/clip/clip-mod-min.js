// clip - modulated min
// Varying clip floor
sin(110).mult(2).clip({ min: sin(0.5, -1, 0), max: 1 }).out()
