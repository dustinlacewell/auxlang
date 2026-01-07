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
		const inputSig = inp.input ?? [0];
		const rises = inp.rise ?? [0.1];
		const falls = inp.fall ?? [0.1];
		const numChannels = Math.max(inputSig.length, rises.length, falls.length);

		if (!state.currents) state.currents = [];
		const currents = state.currents as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const input = inputSig[c % inputSig.length] ?? 0;
			const rise = Math.max(0.0001, rises[c % rises.length] ?? 0.1);
			const fall = Math.max(0.0001, falls[c % falls.length] ?? 0.1);

			const current = currents[c] ?? input;

			let newValue: number;
			if (input > current) {
				const riseRate = 1 / (rise * sampleRate);
				newValue = Math.min(input, current + riseRate);
			} else {
				const fallRate = 1 / (fall * sampleRate);
				newValue = Math.max(input, current - fallRate);
			}

			currents[c] = newValue;
			out.push(newValue);
		}

		return { out };
	},
});
