// swing - modulated n
// Bars alternate: sixteenths shuffled in pairs (swing 8), then a gallop on each beat (swing 4)
tempo(100)
const hats = p`c1*16`
seq(p`<${hats.swing(8)} ${hats.swing(4)}>`)
  .trig
  .hihat()
  .gain(3)
  .out()
