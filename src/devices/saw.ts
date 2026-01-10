import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Mono sawtooth oscillator.
 * Inputs/outputs are plain numbers - polyphony handled at graph construction.
 */
export const saw = device("saw", {
	inputs: inputs({ freq: 440 }),
	outputs: ["audio"],
	defaultInput: "freq",
	defaultOutput: "audio",
	process(inp, _cfg, state, sampleRate) {
		const freq = (inp.freq as number) ?? 440;

		// Phase accumulator
		const phase = (((state.phase as number) ?? 0) + freq / sampleRate) % 1;
		state.phase = phase;

		// Saw wave: -1 to +1
		return { audio: phase * 2 - 1 };
	},
});
