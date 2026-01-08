import type { TestDefinition } from "../types";

export const mathMod: TestDefinition = {
	id: "math-mod",
	category: "Math",
	name: "mod - modulo wrap",
	desc: "Counter modulo creates repeating 4-step cutoff pattern",
	code: `let clk = clock(140)
let cnt = counter(clk.trig)
let wrapped = mod(cnt.count).by(4)
let cutoff = add(mult(wrapped).by(400)).to(400)
let s = seq("c3 c3 g3 c3").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(cutoff).resonance(0.3)).by(e.out))`,
};
