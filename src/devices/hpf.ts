import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Highpass filter (biquad).
 *
 * Attenuates frequencies below the cutoff.
 *
 * Inputs:
 * - `input`: Signal to filter
 * - `cutoff`: Cutoff frequency in Hz (default 200)
 * - `resonance`: Resonance/Q amount 0-1 (default 0)
 *
 * @example
 * ```javascript
 * hpf(noise()).cutoff(1000)            // Remove low frequencies from noise
 * hpf(osc(50)).cutoff(lfo.min(100).max(500))  // Modulated highpass
 * ```
 */
export const hpf = device({
	inputs: inputs({ input: 0, cutoff: 200, resonance: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const input = inp.input ?? 0;
		const cutoff = inp.cutoff ?? 200;
		const resonance = inp.resonance ?? 0;

		const freq = Math.min(cutoff, sampleRate / 2);
		const w = (2 * Math.PI * freq) / sampleRate;
		const a = Math.sin(w) / (2 + resonance * 10);
		const cosw = Math.cos(w);

		// Biquad coefficients for highpass
		const b0 = (1 + cosw) / 2;
		const b1 = -(1 + cosw);
		const b2 = (1 + cosw) / 2;
		const a0 = 1 + a;
		const a1 = -2 * cosw;
		const a2 = 1 - a;

		// Normalize
		const nb0 = b0 / a0;
		const nb1 = b1 / a0;
		const nb2 = b2 / a0;
		const na1 = a1 / a0;
		const na2 = a2 / a0;

		// Get state
		const x1 = (state.x1 as number) ?? 0;
		const x2 = (state.x2 as number) ?? 0;
		const y1 = (state.y1 as number) ?? 0;
		const y2 = (state.y2 as number) ?? 0;

		// Process
		const y0 = nb0 * input + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;

		// Update state
		state.x2 = x1;
		state.x1 = input;
		state.y2 = y1;
		state.y1 = y0;

		return { out: y0 };
	},
});
