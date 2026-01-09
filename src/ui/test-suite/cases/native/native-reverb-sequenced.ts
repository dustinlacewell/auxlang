import type { TestDefinition } from "../types";

export const nativeReverbSequenced: TestDefinition = {
	id: "native-reverb-sequenced",
	category: "Native (WASM)",
	name: "reverb - sequenced",
	desc: "WASM Dattorro plate reverb on sequenced notes",
	code: `let clk = clock(95)
let s = seq("d4 f#4 a4 d5 a4 f#4 d4 ~").clk(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.3)
let synth = mult(saw(s.cv)).by(e.out)
return out(reverb(synth).room(0.8).damp(0.4).wet(0.35).dry(0.65))`,
};
