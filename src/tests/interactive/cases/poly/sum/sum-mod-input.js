// sum - modulated input
// Sum of LFO-modulated voices
poly([
  sin({ freq: lfo(0.3, 200, 250) }),
  sin({ freq: lfo(0.5, 300, 350) }),
  sin({ freq: lfo(0.7, 400, 450) })
])
  .sum()
  .gain(0.2)
  .out()
