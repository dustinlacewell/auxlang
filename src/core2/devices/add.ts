import { device } from "../device/device";

/**
 * Add two signals.
 * Inputs/outputs are plain numbers.
 */
export const add = device("add", {
	inputs: { in: 0, to: 0 },
	outputs: ["out"],
	defaultInput: "in",
	defaultOutput: "out",
	positionalArgs: ["to"],
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		out.signal = inp.in + inp.to;
	},
});
