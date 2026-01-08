import type { TestDefinition } from "../types";

export const tapeWobble: TestDefinition = {
	id: "tape-wobble",
	category: "Effects",
	name: "tape - wobble",
	desc: "Tape delay with wow/flutter modulation on repeats",
	code: `let clk = clock(110)
let s = seq("a4 g4 e4 d4 c4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.2)
let dry = mult(lpf(saw(s.cv)).cutoff(1200)).by(e.out)
return out(tape(dry).time(0.35).feedback(0.4).wow(0.4).flutter(0.2).saturation(0.2).tone(0.6).mix(0.4))`,
};
