/**
 * Debug delay read/write indices
 */

function testDelayIndices() {
	const sampleRate = 48000;
	const time = 0.25;
	const feedback = 0.3;
	const mix = 0.5;

	const maxSamples = Math.ceil(2 * sampleRate); // 96000
	const buffer = new Float32Array(maxSamples);
	let writeIndex = 0;

	const delaySamples = Math.floor(time * sampleRate); // 12000

	console.log(`maxSamples: ${maxSamples}`);
	console.log(`delaySamples: ${delaySamples}`);
	console.log("");

	// Short input
	const inputDuration = 480; // 10ms at 48kHz
	const totalDuration = sampleRate * 2; // 2 seconds

	for (let i = 0; i < totalDuration; i++) {
		const input = i < inputDuration ? Math.sin(i * 0.1) * 0.5 : 0;

		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex] ?? 0;
		buffer[writeIndex] = input + delayed * feedback;

		// Log at key moments
		if (i === 0 || i === inputDuration || i === delaySamples || i === delaySamples + inputDuration) {
			console.log(`Sample ${i}: writeIdx=${writeIndex}, readIdx=${readIndex}, input=${input.toFixed(4)}, delayed=${delayed.toFixed(4)}, writing=${(input + delayed * feedback).toFixed(4)}`);
		}

		writeIndex = (writeIndex + 1) % maxSamples;
	}

	// Where is the data in the buffer?
	console.log("\nBuffer contents (non-zero regions):");
	let inNonZero = false;
	let start = 0;
	for (let i = 0; i <= maxSamples; i++) {
		const val = i < maxSamples ? buffer[i] : 0;
		const isNonZero = val !== 0;
		if (isNonZero && !inNonZero) {
			start = i;
			inNonZero = true;
		} else if (!isNonZero && inNonZero) {
			console.log(`  [${start} - ${i-1}] (${i - start} samples)`);
			inNonZero = false;
		}
	}
}

testDelayIndices();
