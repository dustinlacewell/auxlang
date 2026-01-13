import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * Sample and Hold - captures input value on trigger impulse.
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const sah = device("sah", {
	inputs: inputs({ input: 0, trig: 0 }),
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, state, _sampleRate, _time, out) {
		const input = (inp.input as number) ?? 0;
		const trig = (inp.trig as number) ?? 0;

		let held = (state.held as number) ?? input;

		if (trig > 0.5) {
			held = input;
		}

		state.held = held;
		out.signal = held;
	},
});
