import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";

/**
 * Hi-hat synthesizer.
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const hihat = device("hihat", {
	inputs: inputs({ trig: 0, decay: 0.05, tone: 0.6, metal: 0.5 }),
	outputs: ["audio"],
	defaultInput: "trig",
	defaultOutput: "audio",
	process(inp, _cfg, state, sampleRate) {
		const trig = (inp.trig as number) ?? 0;
		const decay = Math.max(0.005, (inp.decay as number) ?? 0.05);
		const tone = Math.max(0, Math.min(1, (inp.tone as number) ?? 0.6));
		const metal = Math.max(0, Math.min(1, (inp.metal as number) ?? 0.5));

		let phase1 = (state.phase1 as number) ?? 0;
		let phase2 = (state.phase2 as number) ?? 0;
		let phase3 = (state.phase3 as number) ?? 0;
		let phase4 = (state.phase4 as number) ?? 0;
		let phase5 = (state.phase5 as number) ?? 0;
		let phase6 = (state.phase6 as number) ?? 0;
		let amp = (state.amp as number) ?? 0;
		let hpState = (state.hpState as number) ?? 0;

		if (trig > 0.5) {
			amp = 1;
		}

		// Metallic component: 6 detuned square waves
		const baseFreq = 400;
		const ratios = [1.0, 1.4471, 1.617, 1.9265, 2.5028, 2.6637];
		const freqs = ratios.map((r) => baseFreq * r);

		phase1 = (phase1 + (freqs[0] ?? 400) / sampleRate) % 1;
		phase2 = (phase2 + (freqs[1] ?? 578) / sampleRate) % 1;
		phase3 = (phase3 + (freqs[2] ?? 647) / sampleRate) % 1;
		phase4 = (phase4 + (freqs[3] ?? 771) / sampleRate) % 1;
		phase5 = (phase5 + (freqs[4] ?? 1001) / sampleRate) % 1;
		phase6 = (phase6 + (freqs[5] ?? 1065) / sampleRate) % 1;

		const sq = (p: number) => (p < 0.5 ? 1 : -1);
		const metallic =
			(sq(phase1) + sq(phase2) + sq(phase3) + sq(phase4) + sq(phase5) + sq(phase6)) / 6;

		// Noise component
		const rawNoise = Math.random() * 2 - 1;

		// Mix metallic and noise
		const mixed = metallic * metal + rawNoise * (1 - metal);

		// Highpass filter
		const hpCutoff = 4000 + tone * 8000;
		const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sampleRate);
		hpState = hpState + hpCoef * (mixed - hpState);
		const filtered = mixed - hpState;

		// Envelope
		const decayRate = 1 / (decay * sampleRate);
		amp = Math.max(0, amp - amp * decayRate * 5);

		const audio = filtered * amp * 0.7;

		state.phase1 = phase1;
		state.phase2 = phase2;
		state.phase3 = phase3;
		state.phase4 = phase4;
		state.phase5 = phase5;
		state.phase6 = phase6;
		state.amp = amp;
		state.hpState = hpState;

		return { audio };
	},
});
