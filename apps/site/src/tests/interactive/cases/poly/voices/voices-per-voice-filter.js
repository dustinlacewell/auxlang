// voices - per-voice filtering
// Each chord tone with progressively brighter filter
let s = clock(60).seq("[c3,e3,g3]")
s.lane(0).saw().lpf(hz(400)).gain(s.lane(0).gate.ar()).out()
s.lane(1).saw().lpf(hz(800)).gain(s.lane(1).gate.ar()).out()
s.lane(2).saw().lpf(hz(1600)).gain(s.lane(2).gate.ar()).out()
