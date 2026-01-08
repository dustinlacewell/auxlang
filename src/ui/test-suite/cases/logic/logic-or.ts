import type { TestDefinition } from "../types";

export const logicOr: TestDefinition = {
	id: "logic-or",
	category: "Logic",
	name: "or - logical OR",
	desc: "Hihat plays on beat 1 OR beat 3 (first or third quarter)",
	code: `let clk = clock(120)
let cnt = counter(clk.trig)
let mod4 = mod(cnt.count).by(4)
let beat1 = eq(mod4).to(0)
let beat3 = eq(mod4).to(2)
let playHat = or(beat1).with(beat3)
let e = mult(env(clk.trig).attack(0.001).release(0.1).out).by(playHat)
return out(mult(hpf(noise()).cutoff(8000)).by(e))`,
};
