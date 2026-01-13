// snare - all params
// Snappy snare with high pitch and bright wires
clock(120).seq("~ c4 ~ c4").trig.snare({ pitch: 200, tone: 0.3, decay: 0.12, snappy: 0.9 }).out()
