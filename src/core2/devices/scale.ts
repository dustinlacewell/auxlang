/**
 * Scale - maps input from one range to another.
 * Default: maps [-1, 1] (bipolar) to [min, max].
 */

import { device } from "../device/device";
import { inputs } from "../device/inputs";

export const scale = device("scale", {
	inputs: inputs({ input: 0, from: -1, to: 1, min: 0, max: 1 }),
	outputs: ["out"],
	positionalArgs: ["min", "max"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const input = (inp.input as number) ?? 0;
		const from = (inp.from as number) ?? -1;
		const to = (inp.to as number) ?? 1;
		const min = (inp.min as number) ?? 0;
		const max = (inp.max as number) ?? 1;

		// Normalize to 0-1, then scale to min-max
		const normalized = (input - from) / (to - from);
		const scaled = min + normalized * (max - min);

		return { out: scaled };
	},
});
