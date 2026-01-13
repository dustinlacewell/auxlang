/**
 * Poly device - pass-through for creating poly arrays from discrete signals.
 *
 * Usage: poly([saw(220), saw(330), saw(440)])
 *
 * This is just a regular device. When called with an array input,
 * expansion duplicates it (poly.0, poly.1, poly.2), each passing
 * through one voice. Downstream sees the poly via nodeMap.
 */

import { device } from "../device/device";
import { inputs } from "../device/inputs";

export const poly = device("poly", {
	inputs: inputs({ input: 0 }),
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		out.signal = (inp.input as number) ?? 0;
	},
});
