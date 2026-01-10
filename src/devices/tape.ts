import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Tape Delay - warm analog-style delay with tape machine characteristics.
 *
 * Features wow (slow pitch drift), flutter (fast wobble), saturation,
 * and high-frequency roll-off for progressively darker repeats.
 *
 * Inputs:
 * - input: Audio signal to delay
 * - time: Delay time in seconds (0.001-2.0, default 0.3)
 * - feedback: Feedback amount (0-0.98, default 0.4)
 * - mix: Dry/wet mix (0-1, default 0.5)
 * - wow: Slow pitch drift depth (0-1, default 0.3)
 * - flutter: Fast pitch wobble depth (0-1, default 0.2)
 * - saturation: Tape saturation amount (0-1, default 0.3)
 * - tone: High-frequency roll-off (0=dark, 1=bright, default 0.7)
 * - age: Tape wear/noise (0-1, default 0)
 *
 * @example
 * ```javascript
 * tape(synth).time(0.375).feedback(0.5).wow(0.4)  // Wobbly quarter-note delay
 * tape(voice).time(0.1).saturation(0.6).tone(0.4)  // Warm slapback
 * ```
 */
export const tape = device("tape", {
	inputs: inputs({
		input: 0,
		time: 0.3,
		feedback: 0.4,
		mix: 0.5,
		wow: 0.3,
		flutter: 0.2,
		saturation: 0.3,
		tone: 0.7,
		age: 0,
	}),
	outputs: ["audio"],
	defaultInput: "input",
	defaultOutput: "audio",
	wasmUrl: "/tape.wasm",
	process(inp) {
		// WASM-only device - this process function is a placeholder
		// The actual processing happens in the WASM module
		const inputSig = inp.input ?? [];
		return { audio: inputSig };
	},
});
