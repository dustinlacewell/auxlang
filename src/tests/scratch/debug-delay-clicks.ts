/**
 * Debug delay clicking - simulate exactly what the worklet does
 */

// Simulate the delay with state object like the worklet
function simulateDelay() {
	const sampleRate = 48000;
	const state: Record<string, unknown> = {};

	// Delay params
	const time = 0.25;
	const feedback = 0.3;
	const mix = 0.5;

	function process(input: number): number {
		const maxSamples = Math.ceil(2 * sampleRate);

		// Initialize buffer - this happens every sample!
		if (!state.buffer || (state.buffer as Float32Array).length !== maxSamples) {
			console.log("BUFFER INIT at sample", state.sampleCount ?? 0);
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

		return input * (1 - mix) + delayed * mix;
	}

	// Track sample count
	state.sampleCount = 0;

	// Simulate 1 second of audio
	const inputDuration = 0.05 * sampleRate; // 50ms of sound
	const totalDuration = 1 * sampleRate;

	let lastOutput = 0;
	let clicks = 0;

	for (let i = 0; i < totalDuration; i++) {
		state.sampleCount = i;

		// Simple sine input for first 50ms
		const input = i < inputDuration ? Math.sin(i * 0.05) * 0.5 : 0;
		const output = process(input);

		// Detect clicks (large discontinuities)
		const diff = Math.abs(output - lastOutput);
		if (diff > 0.1 && i > 100) {
			clicks++;
			if (clicks <= 10) {
				console.log(`Click at sample ${i}: diff=${diff.toFixed(4)}, output=${output.toFixed(4)}`);
			}
		}
		lastOutput = output;
	}

	console.log(`\nTotal clicks detected: ${clicks}`);
}

simulateDelay();
