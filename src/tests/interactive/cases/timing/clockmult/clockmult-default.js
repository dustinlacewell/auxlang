// clockmult - defaults
// 60 bpm doubled: one pluck a beat, then two a beat once it locks on the second beat
const c = clock(60)
sin(72)
  .mul(c.beat.clockmult().ad(0.005, 0.1))
  .gain(0.3)
  .out()
