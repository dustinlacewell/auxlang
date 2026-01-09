import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal type
type PS = Array<{ id: number; value: number }>;

/**
 * Pick a single voice from a polyphonic signal.
 *
 * @example
 * ```javascript
 * let s = seq("{c4 d4, e4 f4}").clk(clk.trig)
 * let voice0 = pick(s.cv, 0)  // just the first voice
 * let voice1 = pick(s.cv, 1)  // just the second voice
 * ```
 */
export function pick(voiceId: number) {
	// Create config function that embeds the voiceId value directly
	const voiceIdFn = new Function(`return ${voiceId}`) as () => number;

	return device({
		inputs: inputs({ input: 0 }),
		config: {
			voiceId: voiceIdFn,
		},
		outputs: ["out"],
		defaultInput: "input",
		defaultOutput: "out",
		process(inp, cfg, _state, _sampleRate) {
			const inputSig = (inp.input ?? []) as PS;
			const id = cfg.voiceId();

			// Find the voice with matching ID
			const voice = inputSig.find((v) => v.id === id);
			const value = voice?.value ?? 0;

			// Output as mono signal (id 0)
			return { out: [{ id: 0, value }] };
		},
	});
}
