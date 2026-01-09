import type { TestDefinition } from "../types";

export const exprStackTie: TestDefinition = {
	id: "expr-stack-tie",
	category: "Expr Parser",
	name: "seq - tie between stacks",
	desc: "Tie connects matching voices: {c4,e4}_{g4,a4}",
	code: `let clk = clock(80)
let s = seq("{c4,e4}_{g4,a4}").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.5).release(0.3)
let voice = slew(s.cv).rate(0.01)
return out(mult(lpf(saw(voice)).cutoff(1600).resonance(0.15)).by(env1.out))`,
};
