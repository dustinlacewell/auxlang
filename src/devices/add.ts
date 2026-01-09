import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

export const add = device({
	inputs: inputs({ input: 0, to: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const toSig = (inp.to ?? []) as PS;

		if (inputSig.length === 0 && toSig.length === 0) return { out: [] };

		const voiceIds = poly.getVoiceIds(inputSig, toSig);
		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(inputSig, id, 0);
			const b = poly.getValue(toSig, id, 0);
			out.push({ id, value: a + b });
		}

		return { out };
	},
});
