import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * ADSR envelope generator.
 *
 * Classic Attack-Decay-Sustain-Release envelope.
 * - Attack: Time to rise from 0 to 1
 * - Decay: Time to fall from 1 to sustain level
 * - Sustain: Level held while gate is high (0-1)
 * - Release: Time to fall from sustain to 0 after gate goes low
 *
 * Inputs:
 * - `gate`: Gate signal (envelope active while > 0.5)
 * - `attack`: Attack time in seconds (default 0.01)
 * - `decay`: Decay time in seconds (default 0.1)
 * - `sustain`: Sustain level 0-1 (default 0.7)
 * - `release`: Release time in seconds (default 0.3)
 *
 * @example
 * ```javascript
 * adsr(seq.gate)                                    // Default ADSR
 * adsr(seq.gate).attack(0.5).decay(0.2).sustain(0.5).release(1)  // Pad envelope
 * adsr(seq.gate).attack(0.001).decay(0.05).sustain(0).release(0.1)  // Pluck
 * ```
 */
export const adsr = device({
	inputs: inputs({ gate: 0, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }),
	outputs: ["out"],
	defaultInput: "gate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const gate = inp.gate ?? 0;
		const attack = Math.max(0.0001, inp.attack ?? 0.01);
		const decay = Math.max(0.0001, inp.decay ?? 0.1);
		const sustain = Math.max(0, Math.min(1, inp.sustain ?? 0.7));
		const release = Math.max(0.0001, inp.release ?? 0.3);

		const level = (state.level as number) ?? 0;
		const stage = (state.stage as string) ?? "idle";
		const wasGate = (state.wasGate as number) ?? 0;

		const gateOn = gate > 0.5;
		const gateWasOn = wasGate > 0.5;
		const gateRising = gateOn && !gateWasOn;
		const gateFalling = !gateOn && gateWasOn;

		let newLevel = level;
		let newStage = stage;

		// Gate just opened - start attack
		if (gateRising) {
			newStage = "attack";
		}

		// Gate just closed - start release
		if (gateFalling) {
			newStage = "release";
		}

		// Process current stage
		if (newStage === "attack") {
			const attackRate = 1 / (attack * sampleRate);
			newLevel = level + attackRate;
			if (newLevel >= 1) {
				newLevel = 1;
				newStage = "decay";
			}
		} else if (newStage === "decay") {
			const decayRate = (1 - sustain) / (decay * sampleRate);
			newLevel = level - decayRate;
			if (newLevel <= sustain) {
				newLevel = sustain;
				newStage = "sustain";
			}
		} else if (newStage === "sustain") {
			newLevel = sustain;
		} else if (newStage === "release") {
			const releaseRate = sustain / (release * sampleRate);
			newLevel = level - releaseRate;
			if (newLevel <= 0) {
				newLevel = 0;
				newStage = "idle";
			}
		} else {
			// idle
			newLevel = 0;
		}

		state.level = newLevel;
		state.stage = newStage;
		state.wasGate = gate;

		return { out: newLevel };
	},
});
