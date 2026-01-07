import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";

/**
 * Hand clap synthesizer (808/909-style).
 *
 * Generates a clap sound on trigger using:
 * - Bandpass filtered noise
 * - Multiple short bursts followed by a decay tail
 * - Classic "scattered hands" envelope
 *
 * Inputs:
 * - `trig`: Trigger signal (fires on rising edge > 0.5)
 * - `decay`: Tail decay time in seconds (default 0.2)
 * - `tone`: Filter frequency - higher = brighter (default 0.5)
 *
 * @example
 * ```javascript
 * clap(clk.trig)                     // Basic clap
 * clap(clk.trig).decay(0.3)          // Longer reverby clap
 * clap(clk.trig).tone(0.8)           // Brighter clap
 * ```
 */
export const clap = device({
	inputs: inputs({ trig: 0, decay: 0.2, tone: 0.5 }),
	outputs: ["out"],
	defaultInput: "trig",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const trig = (inp.trig ?? [0])[0] ?? 0;
		const decay = Math.max(0.05, (inp.decay ?? [0.2])[0] ?? 0.2);
		const tone = Math.max(0, Math.min(1, (inp.tone ?? [0.5])[0] ?? 0.5));

		// State
		const wasTrig = (state.wasTrig as number) ?? 0;
		let sampleCount = (state.sampleCount as number) ?? 0;
		let triggered = (state.triggered as boolean) ?? false;
		let lpState = (state.lpState as number) ?? 0;
		let hpState = (state.hpState as number) ?? 0;

		// Edge detection
		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const risingEdge = trigOn && !trigWasOn;

		// Retrigger
		if (risingEdge) {
			sampleCount = 0;
			triggered = true;
			// Reset filter state to avoid clicks
			lpState = 0;
			hpState = 0;
		}

		let out = 0;

		if (triggered) {
			// Raw noise source
			const noise = Math.random() * 2 - 1;

			// Bandpass filter: LP then HP
			// Center frequency 1000-2500 Hz based on tone
			const centerFreq = 1000 + tone * 1500;
			const lpFreq = centerFreq * 1.4;
			const hpFreq = centerFreq * 0.7;

			const lpCoef = Math.exp(-2 * Math.PI * lpFreq / sampleRate);
			const hpCoef = Math.exp(-2 * Math.PI * hpFreq / sampleRate);

			// Lowpass
			lpState = lpState * lpCoef + noise * (1 - lpCoef);
			// Highpass
			const hpInput = lpState;
			const hpOut = hpInput - hpState;
			hpState = hpState + (1 - hpCoef) * hpOut;

			const filtered = hpOut * 2; // Boost filtered signal

			// 808-style clap envelope: 4 quick hits then decay
			// Hits at 0ms, 8ms, 18ms, 28ms approximately
			const hitTimes = [0, 0.008, 0.018, 0.028];
			const hitDuration = 0.012; // 12ms per hit
			const hitDecayRate = 30; // Fast decay within each hit

			let env = 0;
			const timeSec = sampleCount / sampleRate;

			// Check each hit
			for (let i = 0; i < hitTimes.length; i++) {
				const hitStart = hitTimes[i] ?? 0;
				const hitEnd = hitStart + hitDuration;
				if (timeSec >= hitStart && timeSec < hitEnd) {
					const hitProgress = (timeSec - hitStart) / hitDuration;
					// Exponential decay within hit
					const hitAmp = Math.exp(-hitProgress * hitDecayRate);
					env = Math.max(env, hitAmp * (0.7 + i * 0.1)); // Later hits slightly louder
				}
			}

			// Decay tail starts overlapping with last hit
			const tailStart = 0.025;
			if (timeSec >= tailStart) {
				const tailProgress = (timeSec - tailStart) / decay;
				const tailAmp = Math.exp(-tailProgress * 4) * 0.8;
				env = Math.max(env, tailAmp);
			}

			out = filtered * env;

			// Stop when done
			if (timeSec > decay * 2 && env < 0.001) {
				triggered = false;
			}

			sampleCount++;
		}

		// Update state
		state.wasTrig = trig;
		state.sampleCount = sampleCount;
		state.triggered = triggered;
		state.lpState = lpState;
		state.hpState = hpState;

		return { out };
	},
});
