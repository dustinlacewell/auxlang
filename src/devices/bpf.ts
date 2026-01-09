import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** Filter state per voice */
interface FilterState {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
}

/** Bandpass filter (biquad). */
export const bpf = device({
	inputs: inputs({ input: 0, cutoff: 1000, resonance: 0.5, mode: 2 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	wasmUrl: "/filter.wasm",
	process(inp, _cfg, state, sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const cutoffs = (inp.cutoff ?? []) as PS;
		const resonances = (inp.resonance ?? []) as PS;

		if (inputSig.length === 0) return { out: [] };

		if (!state.filters) state.filters = new Map<number, FilterState>();
		const filters = state.filters as Map<number, FilterState>;

		const out: PS = [];
		for (const inputCh of inputSig) {
			const id = inputCh.id;
			const input = inputCh.value;
			const cutoff = poly.getValue(cutoffs, id, 1000);
			const resonance = poly.getValue(resonances, id, 0.5);

			const freq = Math.min(cutoff, sampleRate / 2);
			const w = (2 * Math.PI * freq) / sampleRate;
			const Q = 0.5 + resonance * 10;
			const a = Math.sin(w) / (2 * Q);
			const cosw = Math.cos(w);

			const b0 = a;
			const b1 = 0;
			const b2 = -a;
			const a0 = 1 + a;
			const a1 = -2 * cosw;
			const a2 = 1 - a;

			const nb0 = b0 / a0;
			const nb1 = b1 / a0;
			const nb2 = b2 / a0;
			const na1 = a1 / a0;
			const na2 = a2 / a0;

			let fs = filters.get(id);
			if (!fs) {
				fs = { x1: 0, x2: 0, y1: 0, y2: 0 };
				filters.set(id, fs);
			}

			const y0 = nb0 * input + nb1 * fs.x1 + nb2 * fs.x2 - na1 * fs.y1 - na2 * fs.y2;

			fs.x2 = fs.x1;
			fs.x1 = input;
			fs.y2 = fs.y1;
			fs.y1 = y0;

			out.push({ id, value: y0 });
		}

		return { out };
	},
});
