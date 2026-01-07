import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const saw = device({
	inputs: inputs({ pitch: 440, detune: 0 }),
	outputs: ["out"],
	defaultInput: "pitch",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const pitches = inp.pitch ?? [440];
		const detunes = inp.detune ?? [0];
		const numChannels = Math.max(pitches.length, detunes.length);

		// Initialize phase array if needed
		if (!state.phases) state.phases = [];
		const phases = state.phases as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const pitch = pitches[c % pitches.length] ?? 440;
			const detune = detunes[c % detunes.length] ?? 0;
			const freq = pitch * 2 ** (detune / 1200);

			phases[c] = ((phases[c] ?? 0) + freq / sampleRate) % 1;
			out.push(phases[c] * 2 - 1);
		}

		return { out };
	},
});
