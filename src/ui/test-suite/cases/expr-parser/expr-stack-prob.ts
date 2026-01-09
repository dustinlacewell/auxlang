import type { TestDefinition } from "../types";

export const exprStackProb: TestDefinition = {
	id: "expr-stack-prob",
	category: "Expr Parser",
	name: "seqExpr - chord with probability",
	desc: "Whole chord has 70% chance: {c4,e4,g4}?0.7",
	code: `let clk = clock(140)
let s = seqExpr("{c4,e4,g4}?0.7").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(2500).resonance(0.1)).by(env1.out))`,
};
