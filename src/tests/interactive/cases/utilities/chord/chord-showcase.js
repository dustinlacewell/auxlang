// chord - showcase
// Chord progression from sequencer
tempo(30)
const s = seq(chord("<Cmaj7 Fmaj7 Gmaj7 Cmaj7>").voicing())
s.tri()
  .lpf(hz(800))
  .gain(s.gate.adsr({ attack: 0.2, release: 0.5 }))
  .gain(0.2)
  .out()
