import { device } from "../device/device";

/**
 * Slew limiter / lag processor for smoothing signals.
 * Inputs/outputs are plain numbers.
 */
export const slew = device("slew", {
	inputs: { input: 0, rise: 0.1, fall: 0.1 },
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	positionalArgs: ["rise", "fall"],
	process(inp, _cfg, state, sampleRate, _time, out) {
		const input = inp.input as number;
		const rise = (inp.rise as number) ?? 0.1;
		const fall = (inp.fall as number) ?? 0.1;

		// No slew - pass through directly
		if (rise <= 0 && fall <= 0) {
			state.current = input;
			out.signal = input;
			return;
		}

		const current = (state.current as number) ?? input;

		let newValue: number;
		if (input > current) {
			if (rise <= 0) {
				newValue = input;
			} else {
				const riseRate = 1 / (rise * sampleRate);
				newValue = Math.min(input, current + riseRate);
			}
		} else {
			if (fall <= 0) {
				newValue = input;
			} else {
				const fallRate = 1 / (fall * sampleRate);
				newValue = Math.max(input, current - fallRate);
			}
		}

		state.current = newValue;
		out.signal = newValue;
	},
});
