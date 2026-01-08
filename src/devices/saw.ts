import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const saw = device({
	inputs: inputs({ freq: 440, detune: 0 }),
	config: { poly: 1 },
	outputs: ["out"],
	defaultInput: "freq",
	defaultOutput: "out",
	process(inp, cfg, state, sampleRate) {
		const pitchesIn = inp.freq ?? [440];
		const polyCount = Math.max(1, Math.floor(cfg.poly));
		const detuneCents = (inp.detune ?? [0])[0] ?? 0;

		// Expand pitches for unison voices
		const pitches: number[] = [];
		for (let i = 0; i < pitchesIn.length; i++) {
			const basePitch = pitchesIn[i] ?? 440;
			if (polyCount === 1) {
				pitches.push(basePitch);
			} else {
				for (let v = 0; v < polyCount; v++) {
					const t = polyCount === 1 ? 0 : (v / (polyCount - 1)) * 2 - 1;
					const centsOffset = t * detuneCents;
					pitches.push(basePitch * Math.pow(2, centsOffset / 1200));
				}
			}
		}

		// Initialize phase array if needed
		if (!state.phases) state.phases = [];
		const phases = state.phases as number[];

		const out: number[] = [];
		for (let c = 0; c < pitches.length; c++) {
			const freq = pitches[c] ?? 440;
			phases[c] = ((phases[c] ?? 0) + freq / sampleRate) % 1;
			out.push(phases[c] * 2 - 1);
		}

		return { out };
	},
});
