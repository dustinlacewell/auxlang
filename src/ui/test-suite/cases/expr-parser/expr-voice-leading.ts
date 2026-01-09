import type { TestDefinition } from "../types";

export const exprVoiceLeading: TestDefinition = {
	id: "expr-voice-leading",
	category: "Expr Parser",
	name: "seq - voice leading",
	desc: "Middle voice moves while outer voices sustain: major to minor",
	code: `let clk = clock(60)
let s = seq("{c4, e4 eb4, g4}").clk(clk.trig)
let env1 = adsr(s.gate).attack(0.02).decay(0.3).sustain(0.6).release(0.4)
return out(mult(lpf(saw(s.cv)).cutoff(1400).resonance(0.1)).by(env1.out))`,
};
