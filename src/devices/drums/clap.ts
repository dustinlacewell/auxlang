import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";

/**
 * Hand clap synthesizer.
 *
 * Generates a clap sound on trigger using:
 * - Filtered noise burst
 * - Multiple "hits" with short delays (simulating multiple hands)
 * - Bandpass filtering for realistic tone
 *
 * Inputs:
 * - `trig`: Trigger signal (fires on rising edge > 0.5)
 * - `decay`: Tail decay time in seconds (default 0.15)
 * - `tone`: Brightness 0-1 (default 0.5)
 * - `spread`: Time spread of initial hits (default 0.5)
 *
 * @example
 * ```javascript
 * clap(clk.trig)                     // Basic clap
 * clap(clk.trig).decay(0.3)          // Longer reverby clap
 * clap(clk.trig).spread(0.8)         // More scattered initial hits
 * ```
 */
export const clap = device({
	inputs: inputs({ trig: 0, decay: 0.15, tone: 0.5, spread: 0.5 }),
	outputs: ["out"],
	defaultInput: "trig",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const trig = (inp.trig ?? [0])[0] ?? 0;
		const decay = Math.max(0.01, (inp.decay ?? [0.15])[0] ?? 0.15);
		const tone = Math.max(0, Math.min(1, (inp.tone ?? [0.5])[0] ?? 0.5));
		const spread = Math.max(0, Math.min(1, (inp.spread ?? [0.5])[0] ?? 0.5));

		// State
		const wasTrig = (state.wasTrig as number) ?? 0;
		let sampleCount = (state.sampleCount as number) ?? 0;
		let amp = (state.amp as number) ?? 0;
		let triggered = (state.triggered as boolean) ?? false;
		let bpState1 = (state.bpState1 as number) ?? 0;
		let bpState2 = (state.bpState2 as number) ?? 0;

		// Edge detection
		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const risingEdge = trigOn && !trigWasOn;

		// Retrigger
		if (risingEdge) {
			sampleCount = 0;
			amp = 1;
			triggered = true;
		}

		let out = 0;

		if (triggered) {
			// Raw noise
			const rawNoise = Math.random() * 2 - 1;

			// Bandpass filter the noise
			const bpCutoff = 1000 + tone * 2000; // 1k-3k Hz
			const bpQ = 2;
			const w = (2 * Math.PI * bpCutoff) / sampleRate;
			const alpha = Math.sin(w) / (2 * bpQ);
			const cosw = Math.cos(w);

			// Simple resonant bandpass approximation using two one-pole filters
			const lpCoef = 1 - Math.exp(-2 * Math.PI * (bpCutoff * 1.5) / sampleRate);
			const hpCoef = 1 - Math.exp(-2 * Math.PI * (bpCutoff * 0.5) / sampleRate);

			bpState1 = bpState1 + lpCoef * (rawNoise - bpState1);
			bpState2 = bpState2 + hpCoef * (bpState1 - bpState2);
			const filtered = bpState1 - bpState2;

			// Multiple hit envelope - creates the "scattered hands" effect
			// 3-4 quick bursts before the decay tail
			const hitSpacing = Math.floor(0.01 * sampleRate * (1 + spread)); // ~10-20ms between hits
			const numHits = 4;
			let hitEnv = 0;

			for (let i = 0; i < numHits; i++) {
				const hitStart = i * hitSpacing;
				const hitDur = Math.floor(0.008 * sampleRate); // 8ms per hit
				if (sampleCount >= hitStart && sampleCount < hitStart + hitDur) {
					// Quick attack/decay for each hit
					const hitProgress = (sampleCount - hitStart) / hitDur;
					hitEnv = Math.max(hitEnv, 1 - hitProgress);
				}
			}

			// Main decay envelope starts after the hits
			const decayStart = numHits * hitSpacing;
			let tailEnv = 0;
			if (sampleCount >= decayStart) {
				const decayProgress = (sampleCount - decayStart) / (decay * sampleRate);
				tailEnv = Math.exp(-decayProgress * 5);
			}

			// Combine hit envelope and tail
			const totalEnv = Math.max(hitEnv * 0.8, tailEnv);
			amp = totalEnv;

			out = filtered * amp;

			// Stop when envelope is done
			if (sampleCount > decayStart + decay * sampleRate && amp < 0.001) {
				triggered = false;
			}

			sampleCount++;
		}

		// Update state
		state.wasTrig = trig;
		state.sampleCount = sampleCount;
		state.amp = amp;
		state.triggered = triggered;
		state.bpState1 = bpState1;
		state.bpState2 = bpState2;

		return { out };
	},
});
