import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const lfo = device({
	inputs: inputs({ rate: 1, min: -1, max: 1, phase: 0 }),
	outputs: ["out"],
	defaultInput: "rate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const rates = inp.rate ?? [1];
		const mins = inp.min ?? [-1];
		const maxs = inp.max ?? [1];
		const initPhases = inp.phase ?? [0];
		const numChannels = Math.max(rates.length, mins.length, maxs.length, initPhases.length);

		if (!state.phases) state.phases = [];
		const phases = state.phases as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const rate = rates[c % rates.length] ?? 1;
			const min = mins[c % mins.length] ?? -1;
			const max = maxs[c % maxs.length] ?? 1;
			const initPhase = initPhases[c % initPhases.length] ?? 0;

			phases[c] = ((phases[c] ?? initPhase) + rate / sampleRate) % 1;
			const normalized = (Math.sin(phases[c] * Math.PI * 2) + 1) / 2;
			out.push(min + normalized * (max - min));
		}

		return { out };
	},
});
