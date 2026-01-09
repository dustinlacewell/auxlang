import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal format: {id: number, value: number}[]
type PolySignal = Array<{ id: number; value: number }>;

export const saw = device({
	inputs: inputs({ freq: 440, detune: 0 }),
	config: { poly: 1 },
	outputs: ["out"],
	defaultInput: "freq",
	defaultOutput: "out",
	process(inp, cfg, state, sampleRate) {
		const pitchesIn = (inp.freq ?? []) as PolySignal;
		const detuneIn = (inp.detune ?? []) as PolySignal;
		const polyCount = Math.max(1, Math.floor(cfg.poly));
		const detuneCents = detuneIn.length > 0 ? detuneIn[0]!.value : 0;

		if (pitchesIn.length === 0) return { out: [] };

		// State: phase per voice ID
		if (!state.phases) state.phases = new Map<number, number>();
		const phases = state.phases as Map<number, number>;

		const out: PolySignal = [];

		for (const pitchCh of pitchesIn) {
			const voiceId = pitchCh.id;
			const basePitch = pitchCh.value;

			if (polyCount === 1) {
				const phase = ((phases.get(voiceId) ?? 0) + basePitch / sampleRate) % 1;
				phases.set(voiceId, phase);
				out.push({ id: voiceId, value: phase * 2 - 1 });
			} else {
				for (let v = 0; v < polyCount; v++) {
					const subId = voiceId * 1000 + v;
					const t = polyCount === 1 ? 0 : (v / (polyCount - 1)) * 2 - 1;
					const centsOffset = t * detuneCents;
					const detuned = basePitch * Math.pow(2, centsOffset / 1200);
					const phase = ((phases.get(subId) ?? 0) + detuned / sampleRate) % 1;
					phases.set(subId, phase);
					out.push({ id: subId, value: phase * 2 - 1 });
				}
			}
		}

		return { out };
	},
});
