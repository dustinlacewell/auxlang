import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** Sample and Hold - captures input value on trigger. */
export const sah = device({
	inputs: inputs({ input: 0, trig: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const trigs = (inp.trig ?? []) as PS;

		if (inputSig.length === 0 && trigs.length === 0) return { out: [] };

		const voiceIds = poly.getVoiceIds(inputSig, trigs);

		if (!state.helds) state.helds = new Map<number, number>();
		if (!state.wasTrigs) state.wasTrigs = new Map<number, number>();
		const helds = state.helds as Map<number, number>;
		const wasTrigs = state.wasTrigs as Map<number, number>;

		const out: PS = [];
		for (const id of voiceIds) {
			const input = poly.getValue(inputSig, id, 0);
			const trig = poly.getValue(trigs, id, 0);

			const held = helds.get(id) ?? input;
			const wasTrig = wasTrigs.get(id) ?? 0;

			const trigOn = trig > 0.5;
			const trigWasOn = wasTrig > 0.5;
			const risingEdge = trigOn && !trigWasOn;

			const newHeld = risingEdge ? input : held;

			helds.set(id, newHeld);
			wasTrigs.set(id, trig);
			out.push({ id, value: newHeld });
		}

		return { out };
	},
});
