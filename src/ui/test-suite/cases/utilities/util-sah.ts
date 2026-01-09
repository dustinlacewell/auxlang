import type { TestDefinition } from "../types";

export const utilSah: TestDefinition = {
	id: "util-sah",
	category: "Utilities",
	name: "sah - sample and hold",
	desc: "Random pitch each beat - LFO sampled on trigger",
	code: `let clk = clock(150)
let n = noise().min(200).max(800)
let freq = sah(n).clk(clk.trig)
let e = env(clk.gate).attack(0.01).release(0.15)
return out(mult(osc(freq)).by(e.out))`,
};
