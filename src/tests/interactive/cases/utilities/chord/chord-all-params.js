// chord - all params
// A minor 7th chord
tempo(90)
const s = seq(chord("Am7").voicing())
s.tri().gain(0.3).out()
