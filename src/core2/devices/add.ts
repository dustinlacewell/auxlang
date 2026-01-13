import { device } from "../device/device";
import { inputs } from "../device/inputs";

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
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = (inp.input as number) ?? 0;
		const to = (inp.to as number) ?? 0;
		out.signal = input + to;
	},
});
