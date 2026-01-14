/**
 * Mono lowpass filter (biquad).
 */

import { device } from "../device/device";

export const lpf = device("lpf", {
	inputs: { input: 0, cutoff: 1000, resonance: 0 },
	outputs: ["audio"],
	defaultInput: "input",
	defaultOutput: "audio",
	positionalArgs: ["cutoff", "resonance"],
	wasmUrl: "/filter.wasm",
	process(inp, _cfg, state, sampleRate, _time, out) {
		const input = inp.input
		const cutoff = inp.cutoff
		const resonance = inp.resonance

		// Biquad coefficients for lowpass
		const freq = Math.min(cutoff, sampleRate / 2);
		const w = (2 * Math.PI * freq) / sampleRate;
		const a = Math.sin(w) / (2 + resonance * 10);
		const cosw = Math.cos(w);

		const b0 = (1 - cosw) / 2;
		const b1 = 1 - cosw;
		const b2 = (1 - cosw) / 2;
		const a0 = 1 + a;
		const a1 = -2 * cosw;
		const a2 = 1 - a;

		const nb0 = b0 / a0;
		const nb1 = b1 / a0;
		const nb2 = b2 / a0;
		const na1 = a1 / a0;
		const na2 = a2 / a0;

		// Filter state
		const x1 = (state.x1 as number) ?? 0;
		const x2 = (state.x2 as number) ?? 0;
		const y1 = (state.y1 as number) ?? 0;
		const y2 = (state.y2 as number) ?? 0;

		const y0 = nb0 * input + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;

		state.x2 = x1;
		state.x1 = input;
		state.y2 = y1;
		state.y1 = y0;

		out.audio = y0;
	},
});
