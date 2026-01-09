import type { TestDefinition } from "../types";

export const exprChordBasic: TestDefinition = {
	id: "expr-chord-basic",
	category: "Expr Parser",
	name: "seq - basic chord",
	desc: "Three-voice chord using stack syntax {c4,e4,g4}",
	code: `let clk = clock(80)
let s = seq("{c4,e4,g4}").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.4).release(0.3)
return out(mult(lpf(saw(s.cv)).cutoff(1500).resonance(0.2)).by(env1.out))`,
};
