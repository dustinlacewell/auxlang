import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Add two signals.
 * Inputs/outputs are plain numbers.
 */
export const add = device("add", {
	inputs: inputs({ input: 0, to: 0 }),
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	positionalArgs: ["to"],
	process(inp, _cfg, _state, _sampleRate) {
		const input = (inp.input as number) ?? 0;
		const to = (inp.to as number) ?? 0;
		return { signal: input + to };
	},
});
