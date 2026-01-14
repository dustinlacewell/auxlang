import { device } from "../device/device";

/**
 * Counter device - counts triggers and outputs the count.
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const counter = device("counter", {
	inputs: { trig: 0, reset: 0, max: 0 },
	outputs: ["count", "wrap"],
	defaultInput: "trig",
	defaultOutput: "count",
	process(inp, _cfg, state, _sampleRate, _time, out) {
		const trig = inp.trig
		const reset = inp.reset
		const max = Math.floor((inp.max as number) ?? 0);

		let count = (state.count as number) ?? 0;

		let wrap = 0;
		if (reset > 0.5) {
			count = 0;
		} else if (trig > 0.5) {
			count = count + 1;
			if (max > 0 && count >= max) {
				count = 0;
				wrap = 1;
			}
		}

		state.count = count;
		out.count = count;
		out.wrap = wrap;
	},
});
