import type { TestDefinition } from "../types";

export const nativeReverbDrums: TestDefinition = {
	id: "native-reverb-drums",
	category: "Native (WASM)",
	name: "reverb - drums",
	desc: "WASM Freeverb on drum hits",
	code: `let clk = clock(120)
let k = kick(clk.trig)
let s = snare(clockDiv(clk).by(2).trig)
let drums = mix(k).b(gain(s).level(0.6))
return out(reverb(drums).room(0.5).damp(0.6).wet(0.25).dry(0.75))`,
};
