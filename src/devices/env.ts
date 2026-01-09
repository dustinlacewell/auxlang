import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

export const env = device({
	inputs: inputs({ gate: 0, attack: 0.01, release: 0.1 }),
	outputs: ["out"],
	defaultInput: "gate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const gates = (inp.gate ?? []) as PS;
		const attacks = (inp.attack ?? []) as PS;
		const releases = (inp.release ?? []) as PS;

		if (gates.length === 0) return { out: [] };

		// Per-voice state maps
		if (!state.levels) state.levels = new Map<number, number>();
		if (!state.wasGates) state.wasGates = new Map<number, number>();
		const levels = state.levels as Map<number, number>;
		const wasGates = state.wasGates as Map<number, number>;

		const out: PS = [];
		for (const gateCh of gates) {
			const id = gateCh.id;
			const gate = gateCh.value;
			const attack = poly.getValue(attacks, id, 0.01);
			const release = poly.getValue(releases, id, 0.1);

			const level = levels.get(id) ?? 0;
			const wasGate = wasGates.get(id) ?? 0;

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

			levels.set(id, newLevel);
			wasGates.set(id, gate);
			out.push({ id, value: newLevel });
		}

		return { out };
	},
});
