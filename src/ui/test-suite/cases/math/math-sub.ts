import type { TestDefinition } from "../types";

export const mathSub: TestDefinition = {
	id: "math-sub",
	category: "Math",
	name: "sub - inverted envelope",
	desc: "Envelope subtracted from 1 for filter sweep down on note-on",
	code: `let clk = clock(100)
let s = seq("c3 ~ e3 ~ g3 ~ e3 ~").trig(clk.trig)
let e = env(s.gate).attack(0.01).release(0.3)
let invEnv = sub(e.out).from(1)
let cutoff = add(mult(invEnv).by(3000)).to(500)
return out(mult(lpf(saw(s.cv)).cutoff(cutoff).resonance(0.4)).by(e.out))`,
};
