import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";

/**
 * 808-style kick drum synthesizer.
 *
 * Generates a kick sound on trigger using:
 * - Sine wave body with pitch envelope (high → low sweep)
 * - Amplitude envelope with fast attack, medium decay
 *
 * Inputs:
 * - `trig`: Trigger signal (fires on rising edge > 0.5)
 * - `pitch`: Base pitch in Hz (default 50)
 * - `sweep`: Pitch sweep amount - how high the pitch starts (default 4 = 4x base pitch)
 * - `decay`: Amplitude decay time in seconds (default 0.3)
 * - `click`: Click/attack transient amount 0-1 (default 0.3)
 *
 * @example
 * ```javascript
 * kick(clock.trig)                          // Basic kick
 * kick(seq("x ~ x ~").trig(clk.trig).gate)  // Sequenced kick
 * kick(clk.trig).pitch(60).decay(0.5)       // Higher, longer kick
 * ```
 */
export const kick = device({
	inputs: inputs({ trig: 0, pitch: 50, sweep: 4, decay: 0.3, click: 0.3 }),
	outputs: ["out"],
	defaultInput: "trig",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		// Extract first voice value from PolySignal inputs
		type PS = Array<{ id: number; value: number }>;
		const getVal = (sig: PS, def: number) => sig.length > 0 ? sig[0]!.value : def;

		const trig = getVal((inp.trig ?? []) as PS, 0);
		const basePitch = getVal((inp.pitch ?? []) as PS, 50);
		const sweep = getVal((inp.sweep ?? []) as PS, 4);
		const decay = Math.max(0.01, getVal((inp.decay ?? []) as PS, 0.3));
		const click = Math.max(0, Math.min(1, getVal((inp.click ?? []) as PS, 0.3)));

		// State
		const wasTrig = (state.wasTrig as number) ?? 0;
		let phase = (state.phase as number) ?? 0;
		let amp = (state.amp as number) ?? 0;
		let pitchEnv = (state.pitchEnv as number) ?? 0;
		let clickPhase = (state.clickPhase as number) ?? 0;

		// Edge detection
		const trigOn = trig > 0.5;
		const trigWasOn = wasTrig > 0.5;
		const risingEdge = trigOn && !trigWasOn;

		// Retrigger on rising edge
		if (risingEdge) {
			amp = 1;
			pitchEnv = 1;
			phase = 0; // Reset phase to avoid click from discontinuity
			clickPhase = 0;
		}

		// Pitch envelope - fast exponential decay
		const pitchDecayRate = 1 / (0.03 * sampleRate); // 30ms pitch sweep
		pitchEnv = Math.max(0, pitchEnv - pitchEnv * pitchDecayRate * 10);

		// Current pitch with envelope
		const currentPitch = basePitch * (1 + pitchEnv * (sweep - 1));

		// Sine oscillator for body
		phase = (phase + currentPitch / sampleRate) % 1;
		const body = Math.sin(phase * Math.PI * 2);

		// Click transient (short burst of higher harmonics)
		clickPhase += basePitch * 4 / sampleRate;
		const clickEnv = Math.max(0, 1 - clickPhase * 50); // Very fast decay
		const clickSound = Math.sin(clickPhase * Math.PI * 2) * clickEnv * click;

		// Amplitude envelope - exponential decay
		const ampDecayRate = 1 / (decay * sampleRate);
		amp = Math.max(0, amp - amp * ampDecayRate * 3);

		// Combine
		const out = (body + clickSound) * amp;

		// Update state
		state.wasTrig = trig;
		state.phase = phase;
		state.amp = amp;
		state.pitchEnv = pitchEnv;
		state.clickPhase = clickPhase;

		return { out };
	},
});
