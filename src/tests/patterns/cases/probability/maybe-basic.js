// Maybe Basic
// 50% chance each note plays
clock(120)
  .seq("c4? e4? g4? c5?")
  .sin()
  .gain(0.5)
  .out()
