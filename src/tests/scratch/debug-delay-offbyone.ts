/**
 * Trace the off-by-one in delay
 */

function trace() {
	const sampleRate = 48000;
	const maxSamples = 96000;
	const delaySamples = 12000;
	const feedback = 0.3;

	const buffer = new Float32Array(maxSamples);
	let writeIndex = 0;

	console.log("First few samples:");
	for (let i = 0; i < 5; i++) {
		const input = i < 3 ? 1 : 0; // Simple impulse

		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex];
		const toWrite = input + delayed * feedback;

		console.log(`  i=${i}: writeIdx=${writeIndex}, readIdx=${readIndex}, input=${input}, delayed=${delayed}, write=${toWrite.toFixed(2)}`);

		buffer[writeIndex] = toWrite;
		writeIndex = (writeIndex + 1) % maxSamples;
	}

	console.log("\nAt echo time (sample 12000-12005):");
	// Fast forward
	writeIndex = 12000;
	for (let i = 12000; i < 12005; i++) {
		const input = 0;

		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex];

		console.log(`  i=${i}: writeIdx=${writeIndex}, readIdx=${readIndex}, buffer[readIdx]=${delayed.toFixed(4)}`);

		buffer[writeIndex] = input + delayed * feedback;
		writeIndex = (writeIndex + 1) % maxSamples;
	}

	console.log("\nBuffer[0..4]:", Array.from(buffer.slice(0, 5)));
}

trace();
