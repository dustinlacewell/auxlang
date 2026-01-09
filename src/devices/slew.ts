import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** Slew limiter / lag processor for smoothing signals. */
export const slew = device({
	inputs: inputs({ input: 0, rise: 0.1, fall: 0.1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const rises = (inp.rise ?? []) as PS;
		const falls = (inp.fall ?? []) as PS;

		if (inputSig.length === 0) return { out: [] };

		if (!state.currents) state.currents = new Map<number, number>();
		const currents = state.currents as Map<number, number>;

		const out: PS = [];
		for (const inputCh of inputSig) {
			const id = inputCh.id;
			const input = inputCh.value;
			const rise = Math.max(0.0001, poly.getValue(rises, id, 0.1));
			const fall = Math.max(0.0001, poly.getValue(falls, id, 0.1));

			const current = currents.get(id) ?? input;

			let newValue: number;
			if (input > current) {
				const riseRate = 1 / (rise * sampleRate);
				newValue = Math.min(input, current + riseRate);
			} else {
				const fallRate = 1 / (fall * sampleRate);
				newValue = Math.max(input, current - fallRate);
			}

			currents.set(id, newValue);
			out.push({ id, value: newValue });
		}

		return { out };
	},
});
