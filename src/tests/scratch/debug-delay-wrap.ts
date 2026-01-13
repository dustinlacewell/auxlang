/**
 * Debug delay buffer wrap behavior
 */

function testDelayWrap() {
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
	console.log(`Wrap occurs at writeIndex: ${maxSamples} -> 0`);
	console.log(`First wrap at sample: ${maxSamples}`);
	console.log("");

	// Input: short burst then silence
	const inputDuration = 0.05 * sampleRate;
	const totalDuration = 3 * sampleRate;

	const outputs: number[] = [];
	let lastOutput = 0;
	const discontinuities: { sample: number; diff: number; writeIndex: number; readIndex: number }[] = [];

	for (let i = 0; i < totalDuration; i++) {
		const input = i < inputDuration ? Math.sin(i * 0.05) * 0.5 : 0;

		let readIndex = writeIndex - delaySamples;
		if (readIndex < 0) readIndex += maxSamples;

		const delayed = buffer[readIndex] ?? 0;
		buffer[writeIndex] = input + delayed * feedback;

		const prevWriteIndex = writeIndex;
		writeIndex = (writeIndex + 1) % maxSamples;

		const output = input * (1 - mix) + delayed * mix;
		outputs.push(output);

		// Check for discontinuity
		const diff = Math.abs(output - lastOutput);
		if (diff > 0.05 && i > 100 && i > inputDuration) {
			discontinuities.push({ sample: i, diff, writeIndex: prevWriteIndex, readIndex });
		}
		lastOutput = output;
	}

	console.log("Discontinuities found:");
	for (const d of discontinuities.slice(0, 20)) {
		const timeMs = (d.sample / sampleRate * 1000).toFixed(1);
		const echoNum = Math.floor(d.sample / delaySamples);
		console.log(`  Sample ${d.sample} (${timeMs}ms, echo ~${echoNum}): diff=${d.diff.toFixed(4)}, writeIdx=${d.writeIndex}, readIdx=${d.readIndex}`);
	}

	// Check specifically around the wrap point
	console.log("\nChecking around maxSamples wrap:");
	for (let i = maxSamples - 2; i <= maxSamples + 2 && i < totalDuration; i++) {
		console.log(`  Sample ${i}: output=${outputs[i]?.toFixed(6) ?? "N/A"}`);
	}
}

testDelayWrap();
