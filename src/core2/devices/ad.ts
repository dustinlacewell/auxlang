import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * AD envelope generator - attack then decay to zero.
 * Triggered by gate rising edge, ignores gate duration.
 * Use for plucky, percussive sounds.
 */
export const ad = device("ad", {
	inputs: inputs({ gate: 0, attack: 0.01, decay: 0.1 }),
	outputs: ["cv"],
	defaultInput: "gate",
	defaultOutput: "cv",
	process(inp, _cfg, state, sampleRate, _time, out) {
		const gate = (inp.gate as number) ?? 0;
		const attack = Math.max(0.0001, (inp.attack as number) ?? 0.01);
		const decay = Math.max(0.0001, (inp.decay as number) ?? 0.1);

		const level = (state.level as number) ?? 0;
		const stage = (state.stage as string) ?? "idle";
		const wasGate = (state.wasGate as number) ?? 0;

		const gateOn = gate > 0.5;
		const gateWasOn = wasGate > 0.5;
		const gateRising = gateOn && !gateWasOn;

		let newLevel = level;
		let newStage = stage;

		// Retrigger on gate rising edge
		if (gateRising) newStage = "attack";

		if (newStage === "attack") {
			const attackRate = 1 / (attack * sampleRate);
			newLevel = level + attackRate;
			if (newLevel >= 1) {
				newLevel = 1;
				newStage = "decay";
			}
		} else if (newStage === "decay") {
			const decayRate = 1 / (decay * sampleRate);
			newLevel = level - decayRate;
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
