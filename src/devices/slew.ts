import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Slew limiter / lag processor for smoothing signals.
 *
 * Limits how fast a signal can change, creating glides/portamento.
 * Separate rise and fall times allow asymmetric behavior.
 *
 * Inputs:
 * - `input`: Signal to smooth
 * - `rise`: Time in seconds to rise from 0 to 1 (default 0.1)
 * - `fall`: Time in seconds to fall from 1 to 0 (default 0.1)
 *
 * @example
 * ```javascript
 * slew(seq.cv).rise(0.05).fall(0.05)   // Portamento on pitch CV
 * slew(lfo).rise(0.5).fall(0.01)       // Slow attack, fast decay
 * ```
 */
export const slew = device({
	inputs: inputs({ input: 0, rise: 0.1, fall: 0.1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const input = inp.input ?? 0;
		const rise = Math.max(0.0001, inp.rise ?? 0.1);
		const fall = Math.max(0.0001, inp.fall ?? 0.1);

		const current = (state.current as number) ?? input;

		let newValue: number;
		if (input > current) {
			// Rising - limit by rise rate
			const riseRate = 1 / (rise * sampleRate);
			newValue = Math.min(input, current + riseRate);
		} else {
			// Falling - limit by fall rate
			const fallRate = 1 / (fall * sampleRate);
			newValue = Math.max(input, current - fallRate);
		}

		state.current = newValue;
		return { out: newValue };
	},
});
