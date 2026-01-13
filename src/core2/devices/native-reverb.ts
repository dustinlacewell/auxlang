import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * Native WASM Freeverb reverb device.
 *
 * Architecture: 8 parallel comb filters → 4 series allpass filters
 *
 * Inputs:
 * - input: Audio signal to process
 * - room: Room size (0-1), controls reverb tail length
 * - damp: Damping (0-1), high-frequency absorption
 * - wet: Wet level (0-1), amount of reverb
 * - dry: Dry level (0-1), amount of original signal
 *
 * Example:
 *   nativeReverb(synth).room(0.8).damp(0.3).wet(0.4).dry(0.6)
 */
export const nativeReverb = device("nativeReverb", {
	inputs: inputs({ input: 0, room: 0.5, damp: 0.5, wet: 0.33, dry: 0.7 }),
	outputs: ["audio"],
	defaultInput: "input",
	defaultOutput: "audio",
	wasmUrl: "/native.wasm",
	process(inp) {
		// WASM-only - placeholder
		return { audio: (inp.input as number) ?? 0 };
	},
});
