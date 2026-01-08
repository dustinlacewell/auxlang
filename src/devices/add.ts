import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const add = device({
	inputs: inputs({ input: 0, to: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const toSig = inp.to ?? [0];
		const numChannels = Math.max(inputSig.length, toSig.length);

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = inputSig[c % inputSig.length] ?? 0;
			const b = toSig[c % toSig.length] ?? 0;
			out.push(a + b);
		}

		return { out };
	},
});
