// counter - modulated max
// Varying loop length
clock(120).apply(c =>
  counter(c).max(sin(0.1, 2, 8)).scale({ from: 0, to: 8, min: 200, max: 800 }).saw().gain(0.3).out()
)
