import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * Mix multiple signals together with 1/sqrt(n) scaling to prevent clipping.
 * Inputs/outputs are plain numbers.
 */
export const mix = device("mix", {
	inputs: inputs({ a: 0, b: 0, c: 0, d: 0 }),
	outputs: ["signal"],
	defaultInput: "a",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const a = (inp.a as number) ?? 0;
		const b = (inp.b as number) ?? 0;
		const c = (inp.c as number) ?? 0;
		const d = (inp.d as number) ?? 0;

		// Count active inputs for scaling (non-zero)
		const hasA = a !== 0;
		const hasB = b !== 0;
		const hasC = c !== 0;
		const hasD = d !== 0;
		const activeCount = (hasA ? 1 : 0) + (hasB ? 1 : 0) + (hasC ? 1 : 0) + (hasD ? 1 : 0);
		const scale = activeCount > 0 ? 1 / Math.sqrt(activeCount) : 1;

		out.signal = (a + b + c + d) * scale;
	},
});
