import type { TestDefinition } from "../types";

export const tapeSaturated: TestDefinition = {
	id: "tape-saturated",
	category: "Effects",
	name: "tape - saturated",
	desc: "Crunchy power chords through saturated tape",
	code: `let clk = clock(100)
let s = seq("e2,b2*2 e2,b2 e2,b2 a2,e3*2 a2,e3 g2,d3 e2,b2*4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.8).release(0.2)
let dry = mult(lpf(saw(s.cv)).cutoff(800)).by(e.out)
return out(tape(dry).time(0.25).feedback(0.5).saturation(0.8).tone(0.35).wow(0.1).mix(0.4))`,
};
