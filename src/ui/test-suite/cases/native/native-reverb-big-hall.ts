import type { TestDefinition } from "../types";

export const nativeReverbBigHall: TestDefinition = {
	id: "native-reverb-big-hall",
	category: "Native (WASM)",
	name: "reverb - big hall",
	desc: "WASM Freeverb with large room size",
	code: `let clk = clock(60)
let s = seq("c3 ~ ~ ~ g3 ~ ~ ~").trig(clk.trig)
let e = adsr(s.gate).attack(0.1).decay(0.3).sustain(0.5).release(0.5)
let pad = mult(lpf(saw(s.cv)).cutoff(800).res(0.3)).by(e.out)
return out(reverb(pad).room(0.95).damp(0.2).wet(0.5).dry(0.5))`,
};
