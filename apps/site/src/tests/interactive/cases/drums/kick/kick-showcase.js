// kick - showcase
// Four-on-the-floor kick pattern
clock(120)
  .seq("c4*4")
  .trig
  .kick({ pitch: 50, sweep: 4, decay: 0.3 })
  .out()
