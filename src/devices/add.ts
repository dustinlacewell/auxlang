import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const add = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
		return { out: a + b };
	},
});
