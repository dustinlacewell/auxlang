// scope - mod time
// The widget's window zooms in and out as time sweeps
tri()
  .scope({ time: lfo(0.2, 0.005, 0.05) })
  .gain(0.2)
  .out()
