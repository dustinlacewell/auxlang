import { device } from "../../device/device";
import { inputs } from "../../device/inputs";

/**
 * Hand clap synthesizer (808/909-style).
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const clap = device("clap", {
	inputs: inputs({ trig: 0, decay: 0.2, tone: 0.5 }),
	outputs: ["audio"],
	defaultInput: "trig",
	defaultOutput: "audio",
	process(inp, _cfg, state, sampleRate) {
		const trig = (inp.trig as number) ?? 0;
		const decay = Math.max(0.05, (inp.decay as number) ?? 0.2);
		const tone = Math.max(0, Math.min(1, (inp.tone as number) ?? 0.5));

		let sampleCount = (state.sampleCount as number) ?? 0;
		let triggered = (state.triggered as boolean) ?? false;
		let lpState = (state.lpState as number) ?? 0;
		let hpState = (state.hpState as number) ?? 0;

		if (trig > 0.5) {
			sampleCount = 0;
			triggered = true;
			lpState = 0;
			hpState = 0;
		}

		let audio = 0;

		if (triggered) {
			const noise = Math.random() * 2 - 1;

			// Bandpass filter
			const centerFreq = 1000 + tone * 1500;
			const lpFreq = centerFreq * 1.4;
			const hpFreq = centerFreq * 0.7;

			const lpCoef = Math.exp((-2 * Math.PI * lpFreq) / sampleRate);
			const hpCoef = Math.exp((-2 * Math.PI * hpFreq) / sampleRate);

			lpState = lpState * lpCoef + noise * (1 - lpCoef);
			const hpInput = lpState;
			const hpOut = hpInput - hpState;
			hpState = hpState + (1 - hpCoef) * hpOut;

			const filtered = hpOut * 2;

			// 808-style clap envelope: 4 quick hits then decay
			const hitTimes = [0, 0.008, 0.018, 0.028];
			const hitDuration = 0.012;
			const hitDecayRate = 30;

			let env = 0;
			const timeSec = sampleCount / sampleRate;

			for (let i = 0; i < hitTimes.length; i++) {
				const hitStart = hitTimes[i] ?? 0;
				const hitEnd = hitStart + hitDuration;
				if (timeSec >= hitStart && timeSec < hitEnd) {
					const hitProgress = (timeSec - hitStart) / hitDuration;
					const hitAmp = Math.exp(-hitProgress * hitDecayRate);
					env = Math.max(env, hitAmp * (0.7 + i * 0.1));
				}
			}

			// Decay tail
			const tailStart = 0.025;
			if (timeSec >= tailStart) {
				const tailProgress = (timeSec - tailStart) / decay;
				const tailAmp = Math.exp(-tailProgress * 4) * 0.8;
				env = Math.max(env, tailAmp);
			}

			audio = filtered * env;

			if (timeSec > decay * 2 && env < 0.001) {
				triggered = false;
			}

			sampleCount++;
		}

		state.sampleCount = sampleCount;
		state.triggered = triggered;
		state.lpState = lpState;
		state.hpState = hpState;

		return { audio };
	},
});
