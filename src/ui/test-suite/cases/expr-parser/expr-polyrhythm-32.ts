import type { TestDefinition } from "../types";

export const exprPolyrhythm32: TestDefinition = {
	id: "expr-polyrhythm-32",
	category: "Expr Parser",
	name: "seqExpr - 3:2 polyrhythm",
	desc: "Voice 0 plays 3 notes, voice 1 plays 2 notes in same time",
	code: `let clk = clock(100)
let s = seqExpr("{c4 d4 e4, g3 a3}").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(2000).resonance(0.15)).by(env1.out))`,
};
