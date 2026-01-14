/**
 * Gain - multiply input by level.
 */

import { device } from "../device/device";

export const gain = device("gain", {
	inputs: { input: 0, level: 1 },
	outputs: ["signal"],
	positionalArgs: ["level", "input"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const level = inp.level
		out.signal = input * level;
	},
});
