import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

export const gain = device({
	inputs: inputs({ input: 0, amount: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const inputSig = (inp.input ?? []) as PS;
		const amounts = (inp.amount ?? []) as PS;

		if (inputSig.length === 0) return { out: [] };

		const out: PS = [];
		for (const { id } of inputSig) {
			const v = poly.getValue(inputSig, id, 0);
			const a = poly.getValue(amounts, id, 1);
			out.push({ id, value: v * a });
		}

		return { out };
	},
});
