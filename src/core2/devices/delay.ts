import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * Delay effect with feedback and tone control.
 * The tone parameter controls a lowpass filter in the feedback path,
 * which smooths out comb filter artifacts on sustained notes.
 */
export const delay = device("delay", {
	inputs: inputs({ input: 0, time: 0.25, feedback: 0.3, mix: 0.5, tone: 0.7 }),
	outputs: ["audio"],
	defaultInput: "input",
	defaultOutput: "audio",
	process(inp, _cfg, state, sampleRate) {
		const input = (inp.input as number) ?? 0;
		const time = Math.max(0, Math.min(2, (inp.time as number) ?? 0.25));
		const feedback = Math.max(0, Math.min(0.99, (inp.feedback as number) ?? 0.3));
		const mix = Math.max(0, Math.min(1, (inp.mix as number) ?? 0.5));
		// tone: 0 = dark (heavy filtering), 1 = bright (minimal filtering)
		const tone = Math.max(0, Math.min(1, (inp.tone as number) ?? 0.7));

		const maxSamples = Math.ceil(2 * sampleRate);

		// Initialize buffer and filter state
		if (!state.buffer || (state.buffer as Float32Array).length !== maxSamples) {
			state.buffer = new Float32Array(maxSamples);
			state.writeIndex = 0;
			state.lpState = 0;
		}
		const buffer = state.buffer as Float32Array;
		let writeIndex = (state.writeIndex as number) ?? 0;
		let lpState = (state.lpState as number) ?? 0;

		const delaySamples = Math.floor(time * sampleRate);
		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex] ?? 0;

		// Apply lowpass filter in feedback path
		// Coefficient: 0.1 (very dark) to 1.0 (bright/bypass)
		const lpCoeff = 0.1 + tone * 0.9;
		lpState = lpState + lpCoeff * (delayed - lpState);
		state.lpState = lpState;

		// Write filtered feedback to buffer
		buffer[writeIndex] = input + lpState * feedback;

		writeIndex = (writeIndex + 1) % maxSamples;
		state.writeIndex = writeIndex;

		return { audio: input * (1 - mix) + delayed * mix };
	},
});
