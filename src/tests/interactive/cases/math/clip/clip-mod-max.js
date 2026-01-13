// clip - modulated max
// Varying clip ceiling
sin(110).mult(2).clip({ min: -1, max: sin(0.5, 0.3, 1) }).out()
