import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * Slew limiter / lag processor for smoothing signals.
 * Inputs/outputs are plain numbers.
 */
export const slew = device("slew", {
	inputs: inputs({ input: 0, rise: 0.1, fall: 0.1 }),
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, state, sampleRate, _time, out) {
		const input = (inp.input as number) ?? 0;
		const rise = Math.max(0.0001, (inp.rise as number) ?? 0.1);
		const fall = Math.max(0.0001, (inp.fall as number) ?? 0.1);

		const current = (state.current as number) ?? input;

		let newValue: number;
		if (input > current) {
			const riseRate = 1 / (rise * sampleRate);
			newValue = Math.min(input, current + riseRate);
		} else {
			const fallRate = 1 / (fall * sampleRate);
			newValue = Math.max(input, current - fallRate);
		}

		state.current = newValue;
		out.signal = newValue;
	},
});
