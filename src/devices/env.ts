import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

export const env = device({
	inputs: inputs({ gate: 0, attack: 0.01, release: 0.1 }),
	outputs: ["out"],
	defaultInput: "gate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const gates = inp.gate ?? [0];
		const attacks = inp.attack ?? [0.01];
		const releases = inp.release ?? [0.1];
		const numChannels = Math.max(gates.length, attacks.length, releases.length);

		if (!state.levels) state.levels = [];
		if (!state.wasGates) state.wasGates = [];
		const levels = state.levels as number[];
		const wasGates = state.wasGates as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const gate = gates[c % gates.length] ?? 0;
			const attack = attacks[c % attacks.length] ?? 0.01;
			const release = releases[c % releases.length] ?? 0.1;

			const level = levels[c] ?? 0;
			const wasGate = wasGates[c] ?? 0;

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

			levels[c] = newLevel;
			wasGates[c] = gate;
			out.push(newLevel);
		}

		return { out };
	},
});
