// add - modulated to
// Vibrato with growing depth
sin(
  add(440)
    .to(lfo(6).mult(lfo(0.2, 5, 40)))).out()
