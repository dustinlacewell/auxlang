// scope - all params
// A wider, taller widget shows a triangle held still, in a fixed -1..1 scale
tri(57)
  .scope({ time: 0.05, width: 200, height: 60, min: -1, max: 1 })
  .gain(0.2)
  .out()
