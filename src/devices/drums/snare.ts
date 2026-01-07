import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";

/**
 * Snare drum synthesizer.
 *
 * Generates a snare sound on trigger using:
 * - Two sine waves for the body (fundamental + overtone)
 * - Filtered noise for the snare wires
 * - Separate envelopes for body and noise
 *
 * Inputs:
 * - `trig`: Trigger signal (fires on rising edge > 0.5)
 * - `pitch`: Body pitch in Hz (default 180)
 * - `tone`: Mix of body vs noise, 0=all noise, 1=all body (default 0.4)
 * - `decay`: Overall decay time in seconds (default 0.15)
 * - `snappy`: Snare wire brightness/amount (default 0.7)
 *
 * @example
 * ```javascript
 * snare(clk.trig)                           // Basic snare
 * snare(clk.trig).tone(0.6).snappy(0.5)     // More body, less wire
 * snare(clk.trig).pitch(220).decay(0.1)     // Tight high snare
 * ```
 */
export const snare = device({
	inputs: inputs({ trig: 0, pitch: 180, tone: 0.4, decay: 0.15, snappy: 0.7 }),
	outputs: ["out"],
	defaultInput: "trig",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const trig = (inp.trig ?? [0])[0] ?? 0;
		const pitch = (inp.pitch ?? [180])[0] ?? 180;
		const tone = Math.max(0, Math.min(1, (inp.tone ?? [0.4])[0] ?? 0.4));
		const decay = Math.max(0.01, (inp.decay ?? [0.15])[0] ?? 0.15);
		const snappy = Math.max(0, Math.min(1, (inp.snappy ?? [0.7])[0] ?? 0.7));

		// State
		const wasTrig = (state.wasTrig as number) ?? 0;
		let phase1 = (state.phase1 as number) ?? 0;
		let phase2 = (state.phase2 as number) ?? 0;
		let bodyAmp = (state.bodyAmp as number) ?? 0;
		let noiseAmp = (state.noiseAmp as number) ?? 0;
		let lpState = (state.lpState as number) ?? 0;
		let hpState = (state.hpState as number) ?? 0;

		// Edge detection
		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const risingEdge = trigOn && !trigWasOn;

		// Retrigger
		if (risingEdge) {
			bodyAmp = 1;
			noiseAmp = 1;
		}

		// Body - two detuned sines
		phase1 = (phase1 + pitch / sampleRate) % 1;
		phase2 = (phase2 + (pitch * 1.5) / sampleRate) % 1; // Fifth above
		const body = Math.sin(phase1 * Math.PI * 2) * 0.7 +
			Math.sin(phase2 * Math.PI * 2) * 0.3;

		// Body envelope - fast decay
		const bodyDecayRate = 1 / (decay * 0.5 * sampleRate);
		bodyAmp = Math.max(0, bodyAmp - bodyAmp * bodyDecayRate * 5);

		// Noise for snare wires
		const rawNoise = Math.random() * 2 - 1;

		// Bandpass filter the noise (highpass then lowpass)
		// Simple one-pole filters
		const hpCutoff = 2000 + snappy * 4000; // 2k-6k Hz
		const lpCutoff = 5000 + snappy * 7000; // 5k-12k Hz

		const hpCoef = 1 - Math.exp(-2 * Math.PI * hpCutoff / sampleRate);
		const lpCoef = 1 - Math.exp(-2 * Math.PI * lpCutoff / sampleRate);

		hpState = hpState + hpCoef * (rawNoise - hpState);
		const hpOut = rawNoise - hpState;
		lpState = lpState + lpCoef * (hpOut - lpState);
		const filteredNoise = lpState;

		// Noise envelope - slightly longer than body
		const noiseDecayRate = 1 / (decay * sampleRate);
		noiseAmp = Math.max(0, noiseAmp - noiseAmp * noiseDecayRate * 4);

		// Mix body and noise
		const out = body * bodyAmp * tone + filteredNoise * noiseAmp * (1 - tone) * 1.5;

		// Update state
		state.wasTrig = trig;
		state.phase1 = phase1;
		state.phase2 = phase2;
		state.bodyAmp = bodyAmp;
		state.noiseAmp = noiseAmp;
		state.lpState = lpState;
		state.hpState = hpState;

		return { out };
	},
});
