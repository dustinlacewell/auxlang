import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Delay effect with feedback.
 *
 * Delays the input signal by a specified time with optional feedback.
 * Maximum delay time is 2 seconds.
 *
 * Inputs:
 * - `input`: Signal to delay
 * - `time`: Delay time in seconds (default 0.25, max 2.0)
 * - `feedback`: Feedback amount 0-1 (default 0.3)
 * - `mix`: Dry/wet mix 0-1 where 0=dry, 1=wet (default 0.5)
 *
 * @example
 * ```javascript
 * delay(voice).time(0.375).feedback(0.4)  // Quarter note delay at 160bpm
 * delay(drums).time(0.125).mix(0.3)       // Subtle slapback
 * ```
 */
export const delay = device({
	inputs: inputs({ input: 0, time: 0.25, feedback: 0.3, mix: 0.5 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	process(inp, _cfg, state, sampleRate) {
		const input = inp.input ?? 0;
		const time = Math.max(0, Math.min(2, inp.time ?? 0.25));
		const feedback = Math.max(0, Math.min(0.99, inp.feedback ?? 0.3));
		const mix = Math.max(0, Math.min(1, inp.mix ?? 0.5));

		// Initialize buffer if needed (2 seconds max at sample rate)
		const maxSamples = Math.ceil(2 * sampleRate);
		let buffer = state.buffer as Float32Array | undefined;
		if (!buffer || buffer.length !== maxSamples) {
			buffer = new Float32Array(maxSamples);
			state.buffer = buffer;
		}

		let writeIndex = (state.writeIndex as number) ?? 0;

		// Calculate read position
		const delaySamples = Math.floor(time * sampleRate);
		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		// Read delayed sample
		const delayed = buffer[readIndex] ?? 0;

		// Write new sample with feedback
		buffer[writeIndex] = input + delayed * feedback;

		// Advance write position
		writeIndex = (writeIndex + 1) % maxSamples;
		state.writeIndex = writeIndex;

		// Mix dry and wet
		const out = input * (1 - mix) + delayed * mix;

		return { out };
	},
});
