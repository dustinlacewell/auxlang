import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Mix multiple signals together.
 *
 * A convenient 4-channel mixer. Unused channels default to 0.
 * For more channels, chain multiple mix devices.
 *
 * Inputs:
 * - `a`, `b`, `c`, `d`: Input signals (default 0)
 *
 * @example
 * ```javascript
 * mix(bass).b(lead).c(drums)           // Mix three signals
 * mix(a).b(b).c(c).d(d)                // Mix four signals
 * ```
 */
export const mix = device({
	inputs: inputs({ a: 0, b: 0, c: 0, d: 0 }),
	outputs: ["out"],
	defaultInput: "a",
	defaultOutput: "out",
	process(inp, _cfg, _state, _sampleRate) {
		const aIn = inp.a ?? [0];
		const bIn = inp.b ?? [0];
		const cIn = inp.c ?? [0];
		const dIn = inp.d ?? [0];
		const numChannels = Math.max(aIn.length, bIn.length, cIn.length, dIn.length);

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const a = aIn[c % aIn.length] ?? 0;
			const b = bIn[c % bIn.length] ?? 0;
			const cv = cIn[c % cIn.length] ?? 0;
			const d = dIn[c % dIn.length] ?? 0;
			out.push(a + b + cv + d);
		}

		return { out };
	},
});
