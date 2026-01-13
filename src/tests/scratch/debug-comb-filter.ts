/**
 * Test: Is the delay acting as a comb filter that amplifies certain frequencies?
 *
 * At feedback < 1, comb filters should NOT amplify - they just create notches.
 * But if something is wrong, resonant peaks could build up.
 */

const sampleRate = 48000;
const delayTime = 0.23;
const feedback = 0.1;
const mix = 0.5;

const maxSamples = Math.ceil(2 * sampleRate);
const buffer = new Float32Array(maxSamples);
let writeIndex = 0;
const delaySamples = Math.floor(delayTime * sampleRate);

// Feed a long continuous sine wave (simulating gate ON for a long time at slow BPM)
const freq = 261.63; // C4
const gateDuration = 2 * sampleRate; // 2 seconds of gate ON (like 30 BPM)
const totalDuration = 4 * sampleRate;

const outputs: number[] = [];

for (let i = 0; i < totalDuration; i++) {
	// Sine input during gate, then silence
	const envelope = i < gateDuration ? 1 : 0;
	const input = Math.sin(2 * Math.PI * freq * i / sampleRate) * envelope;

	let readIndex = writeIndex - delaySamples;
	if (readIndex < 0) readIndex += maxSamples;

	const delayed = buffer[readIndex];
	buffer[writeIndex] = input + delayed * feedback;
	writeIndex = (writeIndex + 1) % maxSamples;

	const output = input * (1 - mix) + delayed * mix;
	outputs.push(output);
}

// Check: does the output amplitude grow over time during the gate-on period?
console.log("RMS during gate-on period (should be stable, not growing):");
const chunkSize = Math.floor(0.25 * sampleRate);
for (let chunk = 0; chunk < 8; chunk++) {
	const start = chunk * chunkSize;
	const end = Math.min(start + chunkSize, gateDuration);
	if (start >= gateDuration) break;

	let sum = 0;
	for (let i = start; i < end; i++) {
		sum += outputs[i] * outputs[i];
	}
	const rms = Math.sqrt(sum / (end - start));
	console.log(`  ${(chunk * 250).toString().padStart(4)}ms: ${rms.toFixed(6)}`);
}

// Check energy after gate off
console.log("\nRMS after gate off (should decay):");
for (let chunk = 8; chunk < 16; chunk++) {
	const start = chunk * chunkSize;
	const end = Math.min(start + chunkSize, outputs.length);
	if (start >= outputs.length) break;

	let sum = 0;
	for (let i = start; i < end; i++) {
		sum += outputs[i] * outputs[i];
	}
	const rms = Math.sqrt(sum / (end - start));
	console.log(`  ${(chunk * 250).toString().padStart(4)}ms: ${rms.toFixed(6)}`);
}

// Check peak amplitude throughout
let maxPeak = 0;
let maxPeakTime = 0;
for (let i = 0; i < outputs.length; i++) {
	if (Math.abs(outputs[i]) > maxPeak) {
		maxPeak = Math.abs(outputs[i]);
		maxPeakTime = i / sampleRate;
	}
}
console.log(`\nMax peak: ${maxPeak.toFixed(6)} at ${maxPeakTime.toFixed(3)}s`);
console.log(`Input amplitude: 1.0`);
console.log(`Expected max with feedback ${feedback}: ~${(1 / (1 - feedback)).toFixed(2)} (geometric series)`);
