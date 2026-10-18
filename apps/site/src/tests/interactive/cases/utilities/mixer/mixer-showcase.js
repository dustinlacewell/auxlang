// mixer - showcase
// Drums and bass as named channels, bass ducked under the drum level
const c = clock(120)
const drums = c.beat.kick().gain(0.8)
const bass = c.beat.clockdiv(2).sin(36).ad(0.01, 0.3)
mixer({ drums, bass }).level({ bass: 0.5 }).out()
