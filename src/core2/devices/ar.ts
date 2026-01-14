import { device } from "../device/device";

/**
 * AR envelope generator - attack while gate on, release when gate off.
 * Simpler than ADSR - no decay/sustain phase.
 * Level stays at 1.0 while gate is held.
 */
export const ar = device("ar", {
	inputs: { gate: 0, attack: 0.01, release: 0.1 },
	outputs: ["cv"],
	defaultInput: "gate",
	defaultOutput: "cv",
	positionalArgs: ["attack", "release"],
	process(inp, _cfg, state, sampleRate, _time, out) {
		const gate = inp.gate
		const attack = Math.max(0.0001, (inp.attack as number) ?? 0.01);
		const release = Math.max(0.0001, (inp.release as number) ?? 0.1);

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
				newStage = "hold";
			}
		} else if (newStage === "hold") {
			newLevel = 1;
		} else if (newStage === "release") {
			const releaseRate = 1 / (release * sampleRate);
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
