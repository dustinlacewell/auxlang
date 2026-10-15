// chord - defaults
// C major chord (default)
tempo(90)
const s = seq(chord("C").voicing())
s.tri().gain(0.3).out()
