import { device } from "../../device/device";
import { inputs } from "../../device/inputs";

/**
 * Snare drum synthesizer.
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const snare = device("snare", {
	inputs: inputs({ trig: 0, pitch: 180, tone: 0.4, decay: 0.15, snappy: 0.7 }),
	outputs: ["audio"],
	defaultInput: "trig",
	defaultOutput: "audio",
	process(inp, _cfg, state, sampleRate, _time, out) {
		const trig = (inp.trig as number) ?? 0;
		const pitch = (inp.pitch as number) ?? 180;
		const tone = Math.max(0, Math.min(1, (inp.tone as number) ?? 0.4));
		const decay = Math.max(0.01, (inp.decay as number) ?? 0.15);
		const snappy = Math.max(0, Math.min(1, (inp.snappy as number) ?? 0.7));

		let phase1 = (state.phase1 as number) ?? 0;
		let phase2 = (state.phase2 as number) ?? 0;
		let bodyAmp = (state.bodyAmp as number) ?? 0;
		let noiseAmp = (state.noiseAmp as number) ?? 0;
		let lpState = (state.lpState as number) ?? 0;
		let hpState = (state.hpState as number) ?? 0;

		if (trig > 0.5) {
			bodyAmp = 1;
			noiseAmp = 1;
		}

		// Body - two detuned sines
		phase1 = (phase1 + pitch / sampleRate) % 1;
		phase2 = (phase2 + (pitch * 1.5) / sampleRate) % 1;
		const body = Math.sin(phase1 * Math.PI * 2) * 0.7 + Math.sin(phase2 * Math.PI * 2) * 0.3;

		// Body envelope
		const bodyDecayRate = 1 / (decay * 0.5 * sampleRate);
		bodyAmp = Math.max(0, bodyAmp - bodyAmp * bodyDecayRate * 5);

		// Noise for snare wires
		const rawNoise = Math.random() * 2 - 1;

		// Bandpass filter the noise
		const hpCutoff = 2000 + snappy * 4000;
		const lpCutoff = 5000 + snappy * 7000;

		const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sampleRate);
		const lpCoef = 1 - Math.exp((-2 * Math.PI * lpCutoff) / sampleRate);

		hpState = hpState + hpCoef * (rawNoise - hpState);
		const hpOut = rawNoise - hpState;
		lpState = lpState + lpCoef * (hpOut - lpState);
		const filteredNoise = lpState;

		// Noise envelope
		const noiseDecayRate = 1 / (decay * sampleRate);
		noiseAmp = Math.max(0, noiseAmp - noiseAmp * noiseDecayRate * 4);

		const audio = body * bodyAmp * tone + filteredNoise * noiseAmp * (1 - tone) * 1.5;

		state.phase1 = phase1;
		state.phase2 = phase2;
		state.bodyAmp = bodyAmp;
		state.noiseAmp = noiseAmp;
		state.lpState = lpState;
		state.hpState = hpState;

		out.audio = audio;
	},
});
