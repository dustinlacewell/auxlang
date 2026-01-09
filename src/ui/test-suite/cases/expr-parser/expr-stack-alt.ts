import type { TestDefinition } from "../types";

export const exprStackAlt: TestDefinition = {
	id: "expr-stack-alt",
	category: "Expr Parser",
	name: "seqExpr - alternation in stack",
	desc: "One voice alternates while other holds: {<c4 e4>, g3}",
	code: `let clk = clock(100)
let s = seqExpr("{<c4 e4>, g3}").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.4).release(0.2)
return out(mult(lpf(saw(s.cv)).cutoff(2000).resonance(0.12)).by(env1.out))`,
};
