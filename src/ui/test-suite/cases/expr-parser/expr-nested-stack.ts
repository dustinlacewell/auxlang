import type { TestDefinition } from "../types";

export const exprNestedStack: TestDefinition = {
	id: "expr-nested-stack",
	category: "Expr Parser",
	name: "seqExpr - nested stacks",
	desc: "Nested stacks flatten: {c4, {a3, b3}, g4} = 4 voices",
	code: `let clk = clock(70)
let s = seqExpr("{c4, {a3, b3}, g4}").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.4).release(0.3)
return out(mult(lpf(saw(s.cv)).cutoff(1800).resonance(0.1)).by(env1.out))`,
};
