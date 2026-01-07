import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const gain = device({
	inputs: inputs({ input: 0, amount: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const input = inp.input ?? 0;
		const amount = inp.amount ?? 1;
		return { out: input * amount };
	},
});
