// clockmult - showcase
// A slow 30 bpm clock times 8: a fast eight-note arpeggio
const c = clock(30)
const t = c.beat.clockmult(8)
const s = counter(t).seq(p`c4 e4 g4 b4 c5 b4 g4 e4`.steps())
s.tri()
  .mul(t.ad(0.005, 0.05))
  .gain(0.3)
  .out()
