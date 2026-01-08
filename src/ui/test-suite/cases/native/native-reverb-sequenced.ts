import type { TestDefinition } from "../types";

export const nativeReverbSequenced: TestDefinition = {
	id: "native-reverb-sequenced",
	category: "Native (WASM)",
	name: "reverb - sequenced",
	desc: "WASM Freeverb on a sequenced synth",
	code: `let clk = clock(100)
let s = seq("c3 e3 g3 b3").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.3)
let synth = mult(saw(s.cv)).b(e.out)
return out(reverb(synth).room(0.8).damp(0.4).wet(0.35).dry(0.65))`,
};
