// clockDiv - showcase
// Drum pattern with hi-hat, kick, snare
clock(120).apply(c =>
  mix({
    a: c.seq("c4*4").trig.hihat(),
    b: clockDiv(c).by(4).seq("c4").trig.kick(),
    c: clockDiv(c).by(2).seq("~ c4").trig.snare()
  }).out()
)
