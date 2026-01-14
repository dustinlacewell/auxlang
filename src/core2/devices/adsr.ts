import { device } from "../device/device";

/**
 * ADSR envelope generator.
 * Inputs/outputs are plain numbers.
 */
export const adsr = device("adsr", {
	inputs: { gate: 0, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
	outputs: ["cv"],
	defaultInput: "gate",
	defaultOutput: "cv",
	positionalArgs: ["attack", "decay", "sustain", "release"],
	process(inp, _cfg, state, sampleRate, _time, out) {
		const gate = inp.gate
		const attack = Math.max(0.0001, (inp.attack as number) ?? 0.01);
		const decay = Math.max(0.0001, (inp.decay as number) ?? 0.1);
		const sustain = Math.max(0, Math.min(1, (inp.sustain as number) ?? 0.7));
		const release = Math.max(0.0001, (inp.release as number) ?? 0.3);

		const level = (state.level as number) ?? 0;
		const stage = (state.stage as string) ?? "idle";
		const wasGate = (state.wasGate as number) ?? 0;

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

		state.level = newLevel;
		state.stage = newStage;
		state.wasGate = gate;

		out.cv = newLevel;
	},
});
