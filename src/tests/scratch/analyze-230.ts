/**
 * Analyze samples right around 0.230s where the double-peak starts
 */

import * as fs from "fs";

const wavPath = "d:/code/music/algoparty/auxlang/untitled.wav";
const buffer = fs.readFileSync(wavPath);

const sampleRate = buffer.readUInt32LE(24);
const dataOffset = 44;

// Read all samples
const samples: number[] = [];
for (let i = dataOffset; i < buffer.length - 2; i += 2) {
	samples.push(buffer.readInt16LE(i) / 32768);
}

console.log(`Sample rate: ${sampleRate}`);
console.log(`Delay time: 0.23s = ${Math.floor(0.23 * sampleRate)} samples`);
console.log("");

// Look at 0.20s to 0.30s
const startTime = 0.20;
const endTime = 0.30;
const startSample = Math.floor(startTime * sampleRate);
const endSample = Math.floor(endTime * sampleRate);

// Find peaks (local maxima)
console.log("Peaks around 0.230s:");
console.log("Time (s)    | Sample # | Value    | Note");
console.log("------------+----------+----------+-----");

const peaks: { time: number; sample: number; value: number }[] = [];

for (let i = startSample + 1; i < endSample - 1; i++) {
	const prev = samples[i - 1]!;
	const curr = samples[i]!;
	const next = samples[i + 1]!;

	// Local maximum
	if (curr > prev && curr > next && curr > 0.01) {
		peaks.push({ time: i / sampleRate, sample: i, value: curr });
	}
}

// Print peaks with spacing info
for (let i = 0; i < peaks.length; i++) {
	const p = peaks[i]!;
	const spacing = i > 0 ? ((p.sample - peaks[i-1]!.sample) / sampleRate * 1000).toFixed(2) + "ms" : "-";
	const marker = p.time >= 0.228 && p.time <= 0.235 ? " <-- TRANSITION" : "";
	console.log(`${p.time.toFixed(5)}s | ${p.sample.toString().padStart(8)} | ${p.value.toFixed(5)} | gap: ${spacing}${marker}`);
}

// Expected period of C4 (261.63 Hz)
const c4Period = 1 / 261.63;
console.log(`\nExpected C4 period: ${(c4Period * 1000).toFixed(3)}ms = ${Math.floor(c4Period * sampleRate)} samples`);

// Check if there are extra peaks appearing after delay time
console.log("\n\nAnalyzing peak pattern before and after 0.23s:");

const beforePeaks = peaks.filter(p => p.time < 0.23);
const afterPeaks = peaks.filter(p => p.time >= 0.23);

if (beforePeaks.length > 1) {
	const avgSpacingBefore = (beforePeaks[beforePeaks.length-1]!.sample - beforePeaks[0]!.sample) / (beforePeaks.length - 1);
	console.log(`Before 0.23s: ${beforePeaks.length} peaks, avg spacing: ${(avgSpacingBefore / sampleRate * 1000).toFixed(2)}ms`);
}

if (afterPeaks.length > 1) {
	const avgSpacingAfter = (afterPeaks[afterPeaks.length-1]!.sample - afterPeaks[0]!.sample) / (afterPeaks.length - 1);
	console.log(`After 0.23s: ${afterPeaks.length} peaks, avg spacing: ${(avgSpacingAfter / sampleRate * 1000).toFixed(2)}ms`);
}

// Print raw samples around exactly 0.230s
console.log("\n\nRaw samples 0.228s to 0.235s:");
const zoomStart = Math.floor(0.228 * sampleRate);
const zoomEnd = Math.floor(0.235 * sampleRate);

for (let i = zoomStart; i < zoomEnd; i += 5) {
	const time = i / sampleRate;
	const val = samples[i]!;
	const bar = val >= 0
		? " ".repeat(40) + "█".repeat(Math.floor(val * 60))
		: " ".repeat(40 + Math.floor(val * 60)) + "█".repeat(Math.floor(-val * 60));
	console.log(`${time.toFixed(5)}s: ${val.toFixed(4).padStart(8)} ${bar}`);
}
