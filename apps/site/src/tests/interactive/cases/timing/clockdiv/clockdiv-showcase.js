// clockdiv - showcase
// One beat clock drives a kit: hats on every beat, kick on 1 and 3, a clap once a bar
const c = clock(120)
c.beat.hihat().gain(3).out()
c.beat.clockdiv(2).kick().gain(0.7).out()
c.beat.clockdiv(4).clap().gain(0.8).out()
