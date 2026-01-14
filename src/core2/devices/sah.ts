import { device } from "../device/device";

/**
 * Sample and Hold - captures input value on trigger impulse.
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const sah = device("sah", {
	inputs: { input: 0, trig: 0 },
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	positionalArgs: ["input", "trig"],
	process(inp, cfg, state, _sampleRate, _time, out) {
		const input = inp.input;
		const trig = inp.trig;

		let held = (state.held as number) ?? input;

		if (trig > 0.5) {
			held = input;
			state.held = held;
		}

		out.signal = held;
	},
});
