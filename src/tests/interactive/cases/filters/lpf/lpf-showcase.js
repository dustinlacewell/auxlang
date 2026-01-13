// lpf - showcase
// Envelope-controlled filter on bass
clock(120).seq("c2 c2 eb2 c2").apply(s =>
  s.cv.saw().lpf({ cutoff: s.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.1 }).scale({ from: 0, to: 1, min: 200, max: 2000 }), resonance: 0.4 }).out()
)
