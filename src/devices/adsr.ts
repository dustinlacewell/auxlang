import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** ADSR envelope generator. */
export const adsr = device({
	inputs: inputs({ gate: 0, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }),
	outputs: ["out"],
	defaultInput: "gate",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const gates = (inp.gate ?? []) as PS;
		const attacks = (inp.attack ?? []) as PS;
		const decays = (inp.decay ?? []) as PS;
		const sustains = (inp.sustain ?? []) as PS;
		const releases = (inp.release ?? []) as PS;

		if (gates.length === 0) return { out: [] };

		// Per-voice state maps
		if (!state.levels) state.levels = new Map<number, number>();
		if (!state.stages) state.stages = new Map<number, string>();
		if (!state.wasGates) state.wasGates = new Map<number, number>();
		const levels = state.levels as Map<number, number>;
		const stages = state.stages as Map<number, string>;
		const wasGates = state.wasGates as Map<number, number>;

		const out: PS = [];
		for (const gateCh of gates) {
			const id = gateCh.id;
			const gate = gateCh.value;
			const attack = Math.max(0.0001, poly.getValue(attacks, id, 0.01));
			const decay = Math.max(0.0001, poly.getValue(decays, id, 0.1));
			const sustain = Math.max(0, Math.min(1, poly.getValue(sustains, id, 0.7)));
			const release = Math.max(0.0001, poly.getValue(releases, id, 0.3));

			const level = levels.get(id) ?? 0;
			const stage = stages.get(id) ?? "idle";
			const wasGate = wasGates.get(id) ?? 0;

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

			levels.set(id, newLevel);
			stages.set(id, newStage);
			wasGates.set(id, gate);

			out.push({ id, value: newLevel });
		}

		return { out };
	},
});
