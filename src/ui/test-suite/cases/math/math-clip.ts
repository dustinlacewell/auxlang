import type { TestDefinition } from "../types";

export const mathClip: TestDefinition = {
	id: "math-clip",
	category: "Math",
	name: "clip - hard clipping",
	desc: "Saw wave hard-clipped for harsh distortion",
	code: `let clk = clock(120)
let s = seq("a2 a2 d3 a2").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.4).release(0.1)
let raw = mult(saw(s.cv)).by(3)
let clipped = clip(raw).min(-0.5).max(0.5)
return out(mult(lpf(clipped).cutoff(1500)).by(e.out))`,
};
