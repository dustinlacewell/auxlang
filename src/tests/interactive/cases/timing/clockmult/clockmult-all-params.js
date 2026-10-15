// clockmult - all params
// 60 bpm times 4 steps a four-note arp, four notes per beat once locked
const c = clock(60)
const t = clockmult(c.beat, 4)
sin(counter(t).seq(p`c4 e4 g4 c5`.steps()))
  .mul(t.ad(0.005, 0.1))
  .gain(0.3)
  .out()
