/**
 * Debug why delay doesn't drain - trace buffer contents
 */

function testDelayDrain() {
	const sampleRate = 48000;
	const time = 0.25;
	const feedback = 0.1; // Low feedback
	const mix = 0.5;

	const maxSamples = Math.ceil(2 * sampleRate);
	const buffer = new Float32Array(maxSamples);
	let writeIndex = 0;

	const delaySamples = Math.floor(time * sampleRate); // 12000 samples

	// Very short burst - just 10ms
	const inputDuration = 0.01 * sampleRate; // 480 samples
	const totalDuration = 2 * sampleRate; // 2 seconds

	console.log(`delaySamples: ${delaySamples}`);
	console.log(`inputDuration: ${inputDuration}`);
	console.log(`After input ends, echoes should decay by ${feedback}x each ${time}s`);
	console.log("");

	for (let i = 0; i < totalDuration; i++) {
		// Simple impulse input
		const input = i < inputDuration ? Math.sin(i * 0.1) * 0.5 : 0;

		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex] ?? 0;
		buffer[writeIndex] = input + delayed * feedback;

		writeIndex = (writeIndex + 1) % maxSamples;

		const output = input * (1 - mix) + delayed * mix;

		// Log at specific times
		const timeMs = (i / sampleRate) * 1000;
		if (i % 12000 === 0) { // Every 250ms (echo interval)
			// Check what's in the buffer around where we're reading
			let bufferEnergy = 0;
			for (let j = 0; j < maxSamples; j++) {
				bufferEnergy += buffer[j] * buffer[j];
			}
			const rms = Math.sqrt(bufferEnergy / maxSamples);
			console.log(`t=${timeMs.toFixed(0)}ms: output=${output.toExponential(3)}, delayed=${delayed.toExponential(3)}, bufferRMS=${rms.toExponential(3)}`);
		}
	}

	// Final buffer state
	let nonZero = 0;
	let sum = 0;
	for (let i = 0; i < maxSamples; i++) {
		if (buffer[i] !== 0) nonZero++;
		sum += buffer[i];
	}
	console.log(`\nFinal buffer: ${nonZero} non-zero samples, sum=${sum.toExponential(3)}`);
}

testDelayDrain();
