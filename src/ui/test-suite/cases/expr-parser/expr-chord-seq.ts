import type { TestDefinition } from "../types";

export const exprChordSeq: TestDefinition = {
	id: "expr-chord-seq",
	category: "Expr Parser",
	name: "seqExpr - chord sequence",
	desc: "Sequence of chords: Cmaj then Gmaj",
	code: `let clk = clock(60)
let s = seqExpr("{c4,e4,g4} {g3,b3,d4}").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.02).decay(0.3).sustain(0.5).release(0.4)
return out(mult(lpf(saw(s.cv)).cutoff(1200).resonance(0.1)).by(env1.out))`,
};
