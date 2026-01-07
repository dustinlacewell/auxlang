import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const add = device({
	inputs: inputs({ a: 0, b: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const aIn = inp.a ?? [0];
		const bIn = inp.b ?? [0];
		const numChannels = Math.max(aIn.length, bIn.length);

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = aIn[c % aIn.length] ?? 0;
			const b = bIn[c % bIn.length] ?? 0;
			out.push(a + b);
		}

		return { out };
	},
});
