import type { TestDefinition } from "../types";

export const mathClip: TestDefinition = {
	id: "math-clip",
	category: "Math",
	name: "clip - hard clipping",
	desc: "Saw wave hard-clipped for harsh distortion",
	code: `let clk = clock(120)
let s = seq("a2 a2 d3 a2").clk(clk.trig)
let e = s.gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.1 })
s.cv.saw().mult({ by: 3 }).clip({ min: -0.5, max: 0.5 }).lpf({ cutoff: 1500 }).mult({ by: e }).out()`,
};
