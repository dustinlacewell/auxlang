import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** Delay state per voice */
interface DelayState {
	buffer: Float32Array;
	writeIndex: number;
}

/** Delay effect with feedback. */
export const delay = device({
	inputs: inputs({ input: 0, time: 0.25, feedback: 0.3, mix: 0.5 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const times = (inp.time ?? []) as PS;
		const feedbacks = (inp.feedback ?? []) as PS;
		const mixes = (inp.mix ?? []) as PS;

		if (inputSig.length === 0) return { out: [] };

		const maxSamples = Math.ceil(2 * sampleRate);

		if (!state.delays) state.delays = new Map<number, DelayState>();
		const delays = state.delays as Map<number, DelayState>;

		const out: PS = [];
		for (const inputCh of inputSig) {
			const id = inputCh.id;
			const input = inputCh.value;
			const time = Math.max(0, Math.min(2, poly.getValue(times, id, 0.25)));
			const feedback = Math.max(0, Math.min(0.99, poly.getValue(feedbacks, id, 0.3)));
			const mix = Math.max(0, Math.min(1, poly.getValue(mixes, id, 0.5)));

			let ds = delays.get(id);
			if (!ds || ds.buffer.length !== maxSamples) {
				ds = { buffer: new Float32Array(maxSamples), writeIndex: 0 };
				delays.set(id, ds);
			}

			const delaySamples = Math.floor(time * sampleRate);
			let readIndex = ds.writeIndex - delaySamples;
			if (readIndex < 0) readIndex += maxSamples;

			const delayed = ds.buffer[readIndex] ?? 0;
			ds.buffer[ds.writeIndex] = input + delayed * feedback;

			ds.writeIndex = (ds.writeIndex + 1) % maxSamples;

			out.push({ id, value: input * (1 - mix) + delayed * mix });
		}

		return { out };
	},
});
