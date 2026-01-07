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
		const a = inp.a ?? 0;
		const b = inp.b ?? 0;
		const c = inp.c ?? 0;
		const d = inp.d ?? 0;
		return { out: a + b + c + d };
	},
});
