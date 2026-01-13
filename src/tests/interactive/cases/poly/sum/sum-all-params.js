// sum - all params
// Sum three oscillators to mono
poly([sin(220), sin(330), sin(440)])
  .sum()
  .gain(0.2)
  .out()
