// add - modulated to
// Vibrato with growing depth
sin(hz(add({
  in: 440,
  to: lfo(6).mul(lfo(0.2, 5, 40))}))).out()
