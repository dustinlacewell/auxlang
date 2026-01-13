/**
 * Gain - multiply input by level.
 */

import { device } from "../device/device";
import { inputs } from "../device/inputs";

export const gain = device("gain", {
	inputs: inputs({ input: 0, level: 1 }),
	outputs: ["signal"],
	positionalArgs: ["level", "input"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = (inp.input as number) ?? 0;
		const level = (inp.level as number) ?? 1;
		out.signal = input * level;
	},
});
