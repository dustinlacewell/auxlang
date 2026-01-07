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
		const inputSig = inp.input ?? [0];
		const times = inp.time ?? [0.25];
		const feedbacks = inp.feedback ?? [0.3];
		const mixes = inp.mix ?? [0.5];
		const numChannels = Math.max(inputSig.length, times.length, feedbacks.length, mixes.length);

		const maxSamples = Math.ceil(2 * sampleRate);

		if (!state.buffers) state.buffers = [];
		if (!state.writeIndices) state.writeIndices = [];
		const buffers = state.buffers as Float32Array[];
		const writeIndices = state.writeIndices as number[];

		const out: number[] = [];
		for (let c = 0; c < numChannels; c++) {
			const input = inputSig[c % inputSig.length] ?? 0;
			const time = Math.max(0, Math.min(2, times[c % times.length] ?? 0.25));
			const feedback = Math.max(0, Math.min(0.99, feedbacks[c % feedbacks.length] ?? 0.3));
			const mix = Math.max(0, Math.min(1, mixes[c % mixes.length] ?? 0.5));

			if (!buffers[c] || buffers[c].length !== maxSamples) {
				buffers[c] = new Float32Array(maxSamples);
			}
			const buffer = buffers[c];
			let writeIndex = writeIndices[c] ?? 0;

			const delaySamples = Math.floor(time * sampleRate);
			let readIndex = writeIndex - delaySamples;
			if (readIndex < 0) readIndex += maxSamples;

			const delayed = buffer[readIndex] ?? 0;
			buffer[writeIndex] = input + delayed * feedback;

			writeIndex = (writeIndex + 1) % maxSamples;
			writeIndices[c] = writeIndex;

			out.push(input * (1 - mix) + delayed * mix);
		}

		return { out };
	},
});
