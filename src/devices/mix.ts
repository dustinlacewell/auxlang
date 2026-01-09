import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type for process function (runtime uses globalThis.poly)
type PS = Array<{ id: number; value: number }>;

/** Mix multiple signals together with 1/sqrt(n) scaling to prevent clipping. */
export const mix = device({
	inputs: inputs({ a: 0, b: 0, c: 0, d: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const aIn = (inp.a ?? []) as PS;
		const bIn = (inp.b ?? []) as PS;
		const cIn = (inp.c ?? []) as PS;
		const dIn = (inp.d ?? []) as PS;

		if (aIn.length === 0 && bIn.length === 0 && cIn.length === 0 && dIn.length === 0) {
			return { out: [] };
		}

		// Count active inputs for scaling
		const hasA = aIn.length > 0;
		const hasB = bIn.length > 0;
		const hasC = cIn.length > 0;
		const hasD = dIn.length > 0;
		const activeCount = (hasA ? 1 : 0) + (hasB ? 1 : 0) + (hasC ? 1 : 0) + (hasD ? 1 : 0);
		const scale = 1 / Math.sqrt(activeCount);

		const voiceIds = poly.getVoiceIds(aIn, bIn, cIn, dIn);

		const out: PS = [];
		for (const id of voiceIds) {
			const a = poly.getValue(aIn, id, 0);
			const b = poly.getValue(bIn, id, 0);
			const c = poly.getValue(cIn, id, 0);
			const d = poly.getValue(dIn, id, 0);
			out.push({ id, value: (a + b + c + d) * scale });
		}

		return { out };
	},
});
