// chord - modulated root
// Chord with LFO-swept root
chord(lfo(0.2, 200, 300), "maj")
  .tri()
  .gain(0.3)
  .spread()
  .out()
