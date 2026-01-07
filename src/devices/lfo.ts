import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const lfo = device({
	inputs: inputs({ rate: 1, min: -1, max: 1, phase: 0 }),
	outputs: ["out"],
	defaultInput: "rate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const rate = inp.rate ?? 1;
		const min = inp.min ?? -1;
		const max = inp.max ?? 1;
		const initialPhase = inp.phase ?? 0;

		state.phase = ((state.phase as number) ?? initialPhase) + rate / sampleRate;
		state.phase = (state.phase as number) % 1;

		// Sine wave normalized to 0..1, then scaled to min..max
		const normalized = (Math.sin((state.phase as number) * Math.PI * 2) + 1) / 2;
		return { out: min + normalized * (max - min) };
	},
});
