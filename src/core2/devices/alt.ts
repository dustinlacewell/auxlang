import { device } from "../device/device";

/**
 * Alternator - cycles through up to 8 input signals on each trigger.
 * Each trigger advances to the next input in sequence.
 * Only cycles through inputs that were actually provided.
 */
export const alt = device("alt", {
	inputs: {
		trig: 0,
		a: -Infinity,
		b: -Infinity,
		c: -Infinity,
		d: -Infinity,
		e: -Infinity,
		f: -Infinity,
		g: -Infinity,
		h: -Infinity,
	},
	outputs: ["signal"],
	defaultInput: "trig",
	defaultOutput: "signal",
	positionalArgs: ["a", "b", "c", "d", "e", "f", "g", "h"],
	process(inp, _cfg, state, _sampleRate, _time, out) {
		const trig = inp.trig as number;
		const lastTrig = (state.lastTrig as number) ?? 0;
		let index = (state.index as number) ?? 0;

		// Collect only the inputs that were provided
		const allInputs = [inp.a, inp.b, inp.c, inp.d, inp.e, inp.f, inp.g, inp.h];
		const inputs = allInputs.filter((v) => v !== -Infinity) as number[];
		const count = inputs.length || 1;

		// Advance on rising edge
		if (trig > 0.5 && lastTrig <= 0.5) {
			index = (index + 1) % count;
			state.index = index;
		}
		state.lastTrig = trig;

		out.signal = inputs[index] ?? 0;
	},
});
