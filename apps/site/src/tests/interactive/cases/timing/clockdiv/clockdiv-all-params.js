// clockdiv - all params
// Divide by 3, reset each bar: the low note lands on beats 1 and 4 of every bar
const c = clock(120)
sin(81)
  .mul(c.beat.ad(0.005, 0.08))
  .gain(0.2)
  .out()
sin(45)
  .mul(clockdiv({ trig: c.beat, by: 3, reset: c.bar }).ad(0.005, 0.3))
  .gain(0.4)
  .out()
