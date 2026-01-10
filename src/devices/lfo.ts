import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * LFO - low frequency oscillator.
 * Inputs/outputs are plain numbers.
 */
export const lfo = device("lfo", {
	inputs: inputs({ rate: 1, min: -1, max: 1, phase: 0 }),
	outputs: ["cv"],
	defaultInput: "rate",
	defaultOutput: "cv",
	process(inp, _cfg, state, sampleRate) {
		const rate = (inp.rate as number) ?? 1;
		const min = (inp.min as number) ?? -1;
		const max = (inp.max as number) ?? 1;
		const initPhase = (inp.phase as number) ?? 0;

		const phase = (((state.phase as number) ?? initPhase) + rate / sampleRate) % 1;
		state.phase = phase;

		const normalized = (Math.sin(phase * Math.PI * 2) + 1) / 2;
		return { cv: min + normalized * (max - min) };
	},
});
