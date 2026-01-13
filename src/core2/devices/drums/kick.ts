import { device } from "../../device/device";
import { inputs } from "../../device/inputs";

/**
 * 808-style kick drum synthesizer.
 * Expects impulse triggers (trig > 0 for one sample).
 */
export const kick = device("kick", {
	inputs: inputs({ trig: 0, pitch: 50, sweep: 4, decay: 0.3, click: 0.3 }),
	outputs: ["audio"],
	defaultInput: "trig",
	defaultOutput: "audio",
	process(inp, _cfg, state, sampleRate, _time, out) {
		const trig = (inp.trig as number) ?? 0;
		const basePitch = (inp.pitch as number) ?? 50;
		const sweep = (inp.sweep as number) ?? 4;
		const decay = Math.max(0.01, (inp.decay as number) ?? 0.3);
		const click = Math.max(0, Math.min(1, (inp.click as number) ?? 0.3));

		let phase = (state.phase as number) ?? 0;
		let amp = (state.amp as number) ?? 0;
		let pitchEnv = (state.pitchEnv as number) ?? 0;
		let clickPhase = (state.clickPhase as number) ?? 0;

		if (trig > 0.5) {
			amp = 1;
			pitchEnv = 1;
			phase = 0;
			clickPhase = 0;
		}

		// Pitch envelope - fast exponential decay
		const pitchDecayRate = 1 / (0.03 * sampleRate);
		pitchEnv = Math.max(0, pitchEnv - pitchEnv * pitchDecayRate * 10);

		const currentPitch = basePitch * (1 + pitchEnv * (sweep - 1));

		// Sine oscillator for body
		phase = (phase + currentPitch / sampleRate) % 1;
		const body = Math.sin(phase * Math.PI * 2);

		// Click transient
		clickPhase += (basePitch * 4) / sampleRate;
		const clickEnv = Math.max(0, 1 - clickPhase * 50);
		const clickSound = Math.sin(clickPhase * Math.PI * 2) * clickEnv * click;

		// Amplitude envelope - exponential decay
		const ampDecayRate = 1 / (decay * sampleRate);
		amp = Math.max(0, amp - amp * ampDecayRate * 3);

		const audio = (body + clickSound) * amp;

		state.phase = phase;
		state.amp = amp;
		state.pitchEnv = pitchEnv;
		state.clickPhase = clickPhase;

		out.audio = audio;
	},
});
