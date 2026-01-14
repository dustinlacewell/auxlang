import { device } from "../device/device";

/**
 * White noise generator.
 * Inputs/outputs are plain numbers.
 */
export const noise = device("noise", {
	inputs: { min: -1, max: 1 },
	outputs: ["audio"],
	defaultInput: "min",
	defaultOutput: "audio",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const min = (inp.min as number) ?? -1;
		const max = inp.max
		out.audio = min + Math.random() * (max - min);
	},
});
