// shape - all params
// Amount at 0.9 - heavy tanh saturation, a fuzzy crunchy sine
sin(hz(220)).shape({ amount: 0.9 }).gain(0.3).out()
