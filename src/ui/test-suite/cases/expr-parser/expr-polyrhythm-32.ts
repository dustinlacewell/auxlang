import type { TestDefinition } from "../types";

export const exprPolyrhythm32: TestDefinition = {
	id: "expr-polyrhythm-32",
	category: "Expr Parser",
	name: "seq - 3:2 polyrhythm",
	desc: "Voice 0 (bright saw, 3 notes) vs voice 1 (dark tri, 2 notes)",
	code: `let clk = clock(100)
let s = seq("{c4 d4 e4, g3 a3}").clk(clk.trig)

// Voice 0 - bright plucky saw (3 notes)
let cv0 = pick(0)(s.cv)
let gate0 = pick(0)(s.gate)
let env0 = adsr(gate0).attack(0.001).decay(0.12).sustain(0).release(0.05)
let v0 = mult(lpf(saw(cv0)).cutoff(2500)).by(env0.out)

// Voice 1 - darker mellow tri (2 notes)
let cv1 = pick(1)(s.cv)
let gate1 = pick(1)(s.gate)
let env1 = adsr(gate1).attack(0.005).decay(0.2).sustain(0.1).release(0.1)
let v1 = mult(lpf(tri(cv1)).cutoff(800)).by(env1.out)

return out(add(v0).to(v1))`,
};
