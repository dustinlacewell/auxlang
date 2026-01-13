/**
 * Debug delay with quiet echoes - feedback 0.3 vs 0.5
 */

function testDelayQuiet(feedback: number) {
	const sampleRate = 48000;
	const time = 0.25;
	const mix = 0.5;

	const maxSamples = Math.ceil(2 * sampleRate);
	const buffer = new Float32Array(maxSamples);
	let writeIndex = 0;

	const delaySamples = Math.floor(time * sampleRate);

	// Short burst input
	const inputDuration = 0.1 * sampleRate;
	const totalDuration = 3 * sampleRate;

	const outputs: number[] = [];

	for (let i = 0; i < totalDuration; i++) {
		const input = i < inputDuration ? Math.sin(i * 0.05) * 0.5 : 0;

		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex] ?? 0;
		buffer[writeIndex] = input + delayed * feedback;

		writeIndex = (writeIndex + 1) % maxSamples;

		const output = input * (1 - mix) + delayed * mix;
		outputs.push(output);
	}

	// Find peak at each echo interval
	console.log(`\nFeedback ${feedback}:`);
	const echoInterval = delaySamples;
	for (let echo = 0; echo < 12; echo++) {
		const start = echo * echoInterval;
		const end = Math.min(start + echoInterval, outputs.length);
		let peak = 0;
		for (let i = start; i < end; i++) {
			peak = Math.max(peak, Math.abs(outputs[i] ?? 0));
		}
		const scientific = peak.toExponential(4);
		console.log(`  Echo ${echo}: peak = ${scientific}`);
	}

	// Check for denormals or very small values
	let denormalCount = 0;
	let zeroCount = 0;
	const lastHalf = outputs.slice(Math.floor(outputs.length / 2));
	for (const v of lastHalf) {
		if (v === 0) zeroCount++;
		else if (Math.abs(v) < 1e-30) denormalCount++;
	}
	console.log(`  Last half: ${zeroCount} zeros, ${denormalCount} denormals`);
}

testDelayQuiet(0.3);
testDelayQuiet(0.5);
