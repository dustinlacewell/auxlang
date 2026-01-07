import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";

/**
 * Hi-hat synthesizer.
 *
 * Generates metallic hi-hat sounds using:
 * - Multiple detuned square waves for metallic character
 * - Highpass filtered noise
 * - Fast envelope for closed, slower for open
 *
 * Inputs:
 * - `trig`: Trigger signal (fires on rising edge > 0.5)
 * - `decay`: Decay time in seconds (default 0.05 for closed, use 0.3+ for open)
 * - `tone`: Brightness/filter cutoff 0-1 (default 0.6)
 * - `metal`: Amount of metallic ring vs noise 0-1 (default 0.5)
 *
 * @example
 * ```javascript
 * hihat(clk.trig)                    // Closed hi-hat
 * hihat(clk.trig).decay(0.3)         // Open hi-hat
 * hihat(clk.trig).tone(0.8).metal(0.7)  // Bright, ringy hat
 * ```
 */
export const hihat = device({
	inputs: inputs({ trig: 0, decay: 0.05, tone: 0.6, metal: 0.5 }),
	outputs: ["out"],
	defaultInput: "trig",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const trig = (inp.trig ?? [0])[0] ?? 0;
		const decay = Math.max(0.005, (inp.decay ?? [0.05])[0] ?? 0.05);
		const tone = Math.max(0, Math.min(1, (inp.tone ?? [0.6])[0] ?? 0.6));
		const metal = Math.max(0, Math.min(1, (inp.metal ?? [0.5])[0] ?? 0.5));

		// State
		const wasTrig = (state.wasTrig as number) ?? 0;
		let phase1 = (state.phase1 as number) ?? 0;
		let phase2 = (state.phase2 as number) ?? 0;
		let phase3 = (state.phase3 as number) ?? 0;
		let phase4 = (state.phase4 as number) ?? 0;
		let phase5 = (state.phase5 as number) ?? 0;
		let phase6 = (state.phase6 as number) ?? 0;
		let amp = (state.amp as number) ?? 0;
		let hpState = (state.hpState as number) ?? 0;

		// Edge detection
		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const risingEdge = trigOn && !trigWasOn;

		// Retrigger
		if (risingEdge) {
			amp = 1;
		}

		// Metallic component: 6 detuned square waves at inharmonic frequencies
		// Based on 808/909 hi-hat ratios
		const baseFreq = 400;
		const ratios = [1.0, 1.4471, 1.6170, 1.9265, 2.5028, 2.6637];
		const freqs = ratios.map(r => baseFreq * r);

		// Square waves
		phase1 = (phase1 + (freqs[0] ?? 400) / sampleRate) % 1;
		phase2 = (phase2 + (freqs[1] ?? 578) / sampleRate) % 1;
		phase3 = (phase3 + (freqs[2] ?? 647) / sampleRate) % 1;
		phase4 = (phase4 + (freqs[3] ?? 771) / sampleRate) % 1;
		phase5 = (phase5 + (freqs[4] ?? 1001) / sampleRate) % 1;
		phase6 = (phase6 + (freqs[5] ?? 1065) / sampleRate) % 1;

		const sq = (p: number) => p < 0.5 ? 1 : -1;
		const metallic = (
			sq(phase1) + sq(phase2) + sq(phase3) +
			sq(phase4) + sq(phase5) + sq(phase6)
		) / 6;

		// Noise component
		const rawNoise = Math.random() * 2 - 1;

		// Mix metallic and noise
		const mixed = metallic * metal + rawNoise * (1 - metal);

		// Highpass filter - tone controls cutoff
		const hpCutoff = 4000 + tone * 8000; // 4k-12k Hz
		const hpCoef = 1 - Math.exp(-2 * Math.PI * hpCutoff / sampleRate);
		hpState = hpState + hpCoef * (mixed - hpState);
		const filtered = mixed - hpState;

		// Envelope - exponential decay
		const decayRate = 1 / (decay * sampleRate);
		amp = Math.max(0, amp - amp * decayRate * 5);

		const out = filtered * amp * 0.7;

		// Update state
		state.wasTrig = trig;
		state.phase1 = phase1;
		state.phase2 = phase2;
		state.phase3 = phase3;
		state.phase4 = phase4;
		state.phase5 = phase5;
		state.phase6 = phase6;
		state.amp = amp;
		state.hpState = hpState;

		return { out };
	},
});
