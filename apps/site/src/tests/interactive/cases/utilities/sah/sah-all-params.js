// sah - all params
// Sample LFO as stepped pitch
clock(120)
  .seq("c4*2")
  .apply(s =>
    lfo(3, 48, 72)
      .sah(s.trig)
      .tri()
      .gain(s.gate.ar())
      .out())
