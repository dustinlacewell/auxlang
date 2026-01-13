/**
 * Debug delay - test if the JS delay sounds different from expected
 */

// Simulate the delay process function
function testDelay() {
	const sampleRate = 48000;
	const time = 0.25;
	const feedback = 0.3;
	const mix = 0.5;

	const maxSamples = Math.ceil(2 * sampleRate);
	const buffer = new Float32Array(maxSamples);
	let writeIndex = 0;

	// Simulate a plucky input: 0.1s of sound, then silence
	const inputDuration = 0.1 * sampleRate;
	const totalDuration = 3 * sampleRate; // 3 seconds

	const outputs: number[] = [];

	for (let i = 0; i < totalDuration; i++) {
		// Input: decaying sine for first 0.1s
		const input = i < inputDuration ? Math.sin(i * 0.1) * Math.exp(-i / (0.05 * sampleRate)) : 0;

		const delaySamples = Math.floor(time * sampleRate);
		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex] ?? 0;
		buffer[writeIndex] = input + delayed * feedback;

		writeIndex = (writeIndex + 1) % maxSamples;

		const output = input * (1 - mix) + delayed * mix;
		outputs.push(output);
	}

	// Find peak values at each echo
	const echoInterval = Math.floor(time * sampleRate);
	console.log("Echo analysis (should decay by 0.3x each time):");
	for (let echo = 0; echo < 8; echo++) {
		const start = echo * echoInterval;
		const end = Math.min(start + echoInterval, outputs.length);
		let peak = 0;
		for (let i = start; i < end; i++) {
			peak = Math.max(peak, Math.abs(outputs[i] ?? 0));
		}
		console.log(`  Echo ${echo}: peak = ${peak.toFixed(4)}`);
	}

	// Check for DC offset at the end
	const lastSecond = outputs.slice(-sampleRate);
	const avgLast = lastSecond.reduce((a, b) => a + b, 0) / lastSecond.length;
	const maxLast = Math.max(...lastSecond.map(Math.abs));
	console.log(`\nLast second: avg=${avgLast.toFixed(6)}, max=${maxLast.toFixed(6)}`);
}

testDelay();
