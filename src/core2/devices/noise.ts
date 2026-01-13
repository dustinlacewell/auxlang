import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * White noise generator.
 * Inputs/outputs are plain numbers.
 */
export const noise = device("noise", {
	inputs: inputs({ min: -1, max: 1 }),
	outputs: ["audio"],
	defaultInput: "min",
	defaultOutput: "audio",
	process(inp, _cfg, _state, _sampleRate) {
		const min = (inp.min as number) ?? -1;
		const max = (inp.max as number) ?? 1;
		return { audio: min + Math.random() * (max - min) };
	},
});
