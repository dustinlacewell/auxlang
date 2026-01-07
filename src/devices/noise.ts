import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * White noise generator.
 *
 * Outputs random values scaled to the min/max range.
 *
 * Inputs:
 * - `min`: Minimum output value (default -1)
 * - `max`: Maximum output value (default 1)
 *
 * @example
 * ```javascript
 * noise()                    // White noise -1 to 1
 * noise().min(0).max(1)      // Unipolar noise 0 to 1
 * gain(noise()).amount(0.1)  // Quiet noise for texture
 * ```
 */
export const noise = device({
	inputs: inputs({ min: -1, max: 1 }),
	outputs: ["out"],
	defaultInput: "min",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const mins = inp.min ?? [-1];
		const maxs = inp.max ?? [1];
		const numChannels = Math.max(mins.length, maxs.length);

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const min = mins[c % mins.length] ?? -1;
			const max = maxs[c % maxs.length] ?? 1;
			out.push(min + Math.random() * (max - min));
		}

		return { out };
	},
});
