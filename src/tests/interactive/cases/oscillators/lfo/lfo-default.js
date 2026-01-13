// sin as lfo - defaults
// Sine at 1Hz modulating a saw pitch
saw(
  sin(1)
    .scale({
      from: -1,
      to: 1,
      min: 200,
      max: 400}))
  .out()
