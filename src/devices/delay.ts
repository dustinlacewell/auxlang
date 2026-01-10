import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Delay effect with feedback.
 * Inputs/outputs are plain numbers.
 */
export const delay = device("delay", {
	inputs: inputs({ input: 0, time: 0.25, feedback: 0.3, mix: 0.5 }),
	outputs: ["audio"],
	defaultInput: "input",
	defaultOutput: "audio",
	process(inp, _cfg, state, sampleRate) {
		const input = (inp.input as number) ?? 0;
		const time = Math.max(0, Math.min(2, (inp.time as number) ?? 0.25));
		const feedback = Math.max(0, Math.min(0.99, (inp.feedback as number) ?? 0.3));
		const mix = Math.max(0, Math.min(1, (inp.mix as number) ?? 0.5));

		const maxSamples = Math.ceil(2 * sampleRate);

		// Initialize buffer
		if (!state.buffer || (state.buffer as Float32Array).length !== maxSamples) {
			state.buffer = new Float32Array(maxSamples);
			state.writeIndex = 0;
		}
		const buffer = state.buffer as Float32Array;
		let writeIndex = (state.writeIndex as number) ?? 0;

		const delaySamples = Math.floor(time * sampleRate);
		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex] ?? 0;
		buffer[writeIndex] = input + delayed * feedback;

		writeIndex = (writeIndex + 1) % maxSamples;
		state.writeIndex = writeIndex;

		return { audio: input * (1 - mix) + delayed * mix };
	},
});
