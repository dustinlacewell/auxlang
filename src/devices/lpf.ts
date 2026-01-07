import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const lpf = device({
	inputs: inputs({ input: 0, cutoff: 1000, resonance: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const inputSig = inp.input ?? [0];
		const cutoffs = inp.cutoff ?? [1000];
		const resonances = inp.resonance ?? [0];
		const numChannels = Math.max(inputSig.length, cutoffs.length, resonances.length);

		// Per-channel filter state arrays
		if (!state.x1) state.x1 = [];
		if (!state.x2) state.x2 = [];
		if (!state.y1) state.y1 = [];
		if (!state.y2) state.y2 = [];
		const x1Arr = state.x1 as number[];
		const x2Arr = state.x2 as number[];
		const y1Arr = state.y1 as number[];
		const y2Arr = state.y2 as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const input = inputSig[c % inputSig.length] ?? 0;
			const cutoff = cutoffs[c % cutoffs.length] ?? 1000;
			const resonance = resonances[c % resonances.length] ?? 0;

			const freq = Math.min(cutoff, sampleRate / 2);
			const w = (2 * Math.PI * freq) / sampleRate;
			const a = Math.sin(w) / (2 + resonance * 10);
			const cosw = Math.cos(w);

			// Biquad coefficients for lowpass
			const b0 = (1 - cosw) / 2;
			const b1 = 1 - cosw;
			const b2 = (1 - cosw) / 2;
			const a0 = 1 + a;
			const a1 = -2 * cosw;
			const a2 = 1 - a;

			// Normalize
			const nb0 = b0 / a0;
			const nb1 = b1 / a0;
			const nb2 = b2 / a0;
			const na1 = a1 / a0;
			const na2 = a2 / a0;

			// Get per-channel state
			const x1 = x1Arr[c] ?? 0;
			const x2 = x2Arr[c] ?? 0;
			const y1 = y1Arr[c] ?? 0;
			const y2 = y2Arr[c] ?? 0;

			// Process
			const y0 = nb0 * input + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;

			// Update per-channel state
			x2Arr[c] = x1;
			x1Arr[c] = input;
			y2Arr[c] = y1;
			y1Arr[c] = y0;

			out.push(y0);
		}

		return { out };
	},
});
