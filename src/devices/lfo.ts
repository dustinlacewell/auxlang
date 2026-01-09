import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

export const lfo = device({
	inputs: inputs({ rate: 1, min: -1, max: 1, phase: 0 }),
	outputs: ["out"],
	defaultInput: "rate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const rates = (inp.rate ?? []) as PS;
		const mins = (inp.min ?? []) as PS;
		const maxs = (inp.max ?? []) as PS;
		const initPhases = (inp.phase ?? []) as PS;

		if (rates.length === 0) return { out: [] };

		const voiceIds = poly.getVoiceIds(rates, mins, maxs, initPhases);

		// State: phase per voice ID
		if (!state.phases) state.phases = new Map<number, number>();
		const phases = state.phases as Map<number, number>;

		const out: PS = [];
		for (const id of voiceIds) {
			const rate = poly.getValue(rates, id, 1);
			const min = poly.getValue(mins, id, -1);
			const max = poly.getValue(maxs, id, 1);
			const initPhase = poly.getValue(initPhases, id, 0);

			const phase = ((phases.get(id) ?? initPhase) + rate / sampleRate) % 1;
			phases.set(id, phase);
			const normalized = (Math.sin(phase * Math.PI * 2) + 1) / 2;
			out.push({ id, value: min + normalized * (max - min) });
		}

		return { out };
	},
});
