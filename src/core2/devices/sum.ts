/**
 * Sum device - adds all poly voices together at runtime.
 *
 * This is a polyphonic device with processAll - it receives arrays
 * of voice values and outputs a single summed value.
 */

import { device } from "../device/device";

export const sum = device("sum", {
	inputs: { input: 0 },
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	polyphonic: true,
	processAll(inp, _cfg, _state, _sampleRate, _time, out) {
		const voices = inp.input ?? [];
		let total = 0;
		for (const v of voices) {
			total += v;
		}
		out.signal = total;
	},
});
