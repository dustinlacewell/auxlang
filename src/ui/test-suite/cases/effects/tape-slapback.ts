import type { TestDefinition } from "../types";

export const tapeSlapback: TestDefinition = {
	id: "tape-slapback",
	category: "Effects",
	name: "tape - slapback",
	desc: "Short tape delay for rockabilly slapback doubling",
	code: `let clk = clock(150)
let s = seq("e4 e4 e4 d4 c4 c4 d4 e4 d4 c4").trig(clk.trig)
let e = adsr(s.gate).attack(0.005).decay(0.15).sustain(0.1).release(0.1)
let dry = mult(lpf(saw(s.cv)).cutoff(2000).resonance(0.2)).by(e.out)
return out(tape(dry).time(0.07).feedback(0.2).saturation(0.3).tone(0.7).mix(0.35))`,
};
