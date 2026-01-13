/**
 * Analyze WAV file for the "crunchy" spot in the delay tail
 */

import * as fs from "fs";

// Read WAV file
const wavPath = "d:/code/music/algoparty/auxlang/untitled.wav";
const buffer = fs.readFileSync(wavPath);

// Parse WAV header
const riff = buffer.toString("ascii", 0, 4);
const format = buffer.toString("ascii", 8, 12);
console.log(`Format: ${riff} / ${format}`);

const audioFormat = buffer.readUInt16LE(20);
const numChannels = buffer.readUInt16LE(22);
const sampleRate = buffer.readUInt32LE(24);
const bitsPerSample = buffer.readUInt16LE(34);

console.log(`Channels: ${numChannels}`);
console.log(`Sample Rate: ${sampleRate}`);
console.log(`Bits per sample: ${bitsPerSample}`);
console.log(`Audio format: ${audioFormat} (1=PCM)`);

// Find data chunk
let dataOffset = 12;
while (dataOffset < buffer.length - 8) {
	const chunkId = buffer.toString("ascii", dataOffset, dataOffset + 4);
	const chunkSize = buffer.readUInt32LE(dataOffset + 4);
	if (chunkId === "data") {
		dataOffset += 8;
		break;
	}
	dataOffset += 8 + chunkSize;
}

console.log(`Data starts at offset: ${dataOffset}`);

// Read samples (16-bit signed PCM, stereo -> take left channel)
const samples: number[] = [];
const bytesPerSample = bitsPerSample / 8;
const frameSize = bytesPerSample * numChannels;

for (let i = dataOffset; i < buffer.length - frameSize; i += frameSize) {
	const sample = buffer.readInt16LE(i) / 32768; // Normalize to -1..1
	samples.push(sample);
}

console.log(`Total samples: ${samples.length}`);
console.log(`Duration: ${(samples.length / sampleRate).toFixed(2)}s`);

// Analyze: find regions of "crunchiness"
// Crunchiness = high frequency content = large second derivative

function analyzeWindow(start: number, size: number): { rms: number; hfEnergy: number; zeroCrossings: number } {
	const end = Math.min(start + size, samples.length);
	let sum = 0;
	let hfSum = 0;
	let crossings = 0;
	let lastSign = samples[start] >= 0;

	for (let i = start; i < end; i++) {
		const s = samples[i]!;
		sum += s * s;

		// High frequency energy: second derivative
		if (i >= start + 2) {
			const d2 = samples[i]! - 2 * samples[i - 1]! + samples[i - 2]!;
			hfSum += d2 * d2;
		}

		// Zero crossings
		const sign = s >= 0;
		if (sign !== lastSign) crossings++;
		lastSign = sign;
	}

	return {
		rms: Math.sqrt(sum / (end - start)),
		hfEnergy: Math.sqrt(hfSum / (end - start)),
		zeroCrossings: crossings,
	};
}

// Analyze in 10ms windows
const windowSize = Math.floor(sampleRate * 0.01);
console.log(`\nWindow size: ${windowSize} samples (10ms)`);

console.log("\nAnalysis (time, RMS, HF energy, HF/RMS ratio):");
console.log("Looking for high HF/RMS ratio (crunchiness) when RMS is low...\n");

const results: { time: number; rms: number; hfEnergy: number; ratio: number }[] = [];

for (let i = 0; i < samples.length; i += windowSize) {
	const { rms, hfEnergy } = analyzeWindow(i, windowSize);
	const time = i / sampleRate;
	const ratio = rms > 0.0001 ? hfEnergy / rms : 0;
	results.push({ time, rms, hfEnergy, ratio });
}

// Find the "crunchy" spots - high ratio when RMS is small but not silent
const suspicious = results.filter(r => r.rms > 0.001 && r.rms < 0.1 && r.ratio > 0.5);

console.log("Suspicious crunchy regions (RMS between 0.001-0.1, high HF ratio):");
for (const r of suspicious.slice(0, 20)) {
	console.log(`  ${r.time.toFixed(3)}s: RMS=${r.rms.toFixed(6)}, HF=${r.hfEnergy.toFixed(6)}, ratio=${r.ratio.toFixed(3)}`);
}

// Print full timeline
console.log("\n\nFull timeline (every 50ms):");
for (let i = 0; i < results.length; i += 5) {
	const r = results[i]!;
	const bar = "█".repeat(Math.min(50, Math.floor(r.rms * 100)));
	const hfBar = "░".repeat(Math.min(50, Math.floor(r.ratio * 20)));
	console.log(`${r.time.toFixed(2)}s: ${bar}${hfBar} (RMS=${r.rms.toFixed(4)}, ratio=${r.ratio.toFixed(2)})`);
}
