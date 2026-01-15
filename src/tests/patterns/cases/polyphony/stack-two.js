// Stack Two Voices
// Simple two-note harmony
clock(60)
  .seq("{c4,e4}")
  .sin()
  .gain(0.5)
  .out()
