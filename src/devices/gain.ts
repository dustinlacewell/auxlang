import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const gain = device({
	inputs: inputs({ input: 0, amount: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = inp.input ?? [0];
		const amounts = inp.amount ?? [1];
		const numChannels = Math.max(inputSig.length, amounts.length);

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const v = inputSig[c % inputSig.length] ?? 0;
			const a = amounts[c % amounts.length] ?? 1;
			out.push(v * a);
		}

		return { out };
	},
});
