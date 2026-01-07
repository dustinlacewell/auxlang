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
		const gates = inp.gate ?? [0];
		const attacks = inp.attack ?? [0.01];
		const decays = inp.decay ?? [0.1];
		const sustains = inp.sustain ?? [0.7];
		const releases = inp.release ?? [0.3];
		const numChannels = Math.max(gates.length, attacks.length, decays.length, sustains.length, releases.length);

		// Per-channel state arrays
		if (!state.levels) state.levels = [];
		if (!state.stages) state.stages = [];
		if (!state.wasGates) state.wasGates = [];
		const levels = state.levels as number[];
		const stages = state.stages as string[];
		const wasGates = state.wasGates as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const gate = gates[c % gates.length] ?? 0;
			const attack = Math.max(0.0001, attacks[c % attacks.length] ?? 0.01);
			const decay = Math.max(0.0001, decays[c % decays.length] ?? 0.1);
			const sustain = Math.max(0, Math.min(1, sustains[c % sustains.length] ?? 0.7));
			const release = Math.max(0.0001, releases[c % releases.length] ?? 0.3);

			const level = levels[c] ?? 0;
			const stage = stages[c] ?? "idle";
			const wasGate = wasGates[c] ?? 0;

			const gateOn = gate > 0.5;
			const gateWasOn = wasGate > 0.5;
			const gateRising = gateOn && !gateWasOn;
			const gateFalling = !gateOn && gateWasOn;

			let newLevel = level;
			let newStage = stage;

			if (gateRising) newStage = "attack";
			if (gateFalling) newStage = "release";

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
				newLevel = 0;
			}

			levels[c] = newLevel;
			stages[c] = newStage;
			wasGates[c] = gate;

			out.push(newLevel);
		}

		return { out };
	},
});
