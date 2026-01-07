import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const env = device({
	inputs: inputs({ gate: 0, attack: 0.01, release: 0.1 }),
	outputs: ["out"],
	defaultInput: "gate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const gate = inp.gate ?? 0;
		const attack = inp.attack ?? 0.01;
		const release = inp.release ?? 0.1;

		const level = (state.level as number) ?? 0;
		const wasGate = (state.wasGate as number) ?? 0;

		const gateOn = gate > 0.5;
		const gateWasOn = wasGate > 0.5;

		let newLevel = level;

		if (gateOn) {
			const attackRate = 1 / (attack * sampleRate);
			newLevel = Math.min(1, level + attackRate);
		} else if (gateWasOn && !gateOn) {
			newLevel = level;
		} else {
			const releaseRate = 1 / (release * sampleRate);
			newLevel = Math.max(0, level - releaseRate);
		}

		state.level = newLevel;
		state.wasGate = gate;

		return { out: newLevel };
	},
});
