/**
 * Zoom in on the 0.97s region where the crunch happens
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

// Focus on 0.9s to 1.1s
const startTime = 0.9;
const endTime = 1.15;
const startSample = Math.floor(startTime * sampleRate);
const endSample = Math.floor(endTime * sampleRate);

console.log(`Analyzing ${startTime}s to ${endTime}s (samples ${startSample} to ${endSample})`);
console.log(`Sample rate: ${sampleRate}\n`);

// Analyze in 5ms windows with more detail
const windowSize = Math.floor(sampleRate * 0.005); // 5ms

console.log("Detailed analysis (5ms windows):");
console.log("Time     | RMS      | HF Energy | Ratio  | Peak");
console.log("---------+----------+-----------+--------+--------");

for (let i = startSample; i < endSample; i += windowSize) {
	const end = Math.min(i + windowSize, samples.length);

	let sum = 0;
	let hfSum = 0;
	let peak = 0;

	for (let j = i; j < end; j++) {
		const s = samples[j]!;
		sum += s * s;
		peak = Math.max(peak, Math.abs(s));

		if (j >= i + 2) {
			const d2 = samples[j]! - 2 * samples[j-1]! + samples[j-2]!;
			hfSum += d2 * d2;
		}
	}

	const rms = Math.sqrt(sum / (end - i));
	const hf = Math.sqrt(hfSum / (end - i));
	const ratio = rms > 0.0001 ? hf / rms : 0;
	const time = i / sampleRate;

	// Visual indicator
	let indicator = "";
	if (ratio > 0.1) indicator = " <<<";
	if (ratio > 0.2) indicator = " <<< CRUNCHY";

	console.log(`${time.toFixed(3)}s | ${rms.toFixed(6)} | ${hf.toFixed(7)} | ${ratio.toFixed(4)} | ${peak.toFixed(6)}${indicator}`);
}

// Print actual sample values around 0.97s
console.log("\n\nActual samples around 0.97s (every 10th sample):");
const focusStart = Math.floor(0.96 * sampleRate);
const focusEnd = Math.floor(0.99 * sampleRate);

for (let i = focusStart; i < focusEnd; i += 10) {
	const time = i / sampleRate;
	const val = samples[i]!;
	const bar = val >= 0
		? " ".repeat(30) + "█".repeat(Math.floor(val * 200))
		: " ".repeat(30 + Math.floor(val * 200)) + "█".repeat(Math.floor(-val * 200));
	console.log(`${time.toFixed(4)}s: ${val.toFixed(6)} ${bar}`);
}

// Look for discontinuities
console.log("\n\nLargest sample-to-sample jumps around 0.97s:");
const jumps: {time: number, jump: number, before: number, after: number}[] = [];

for (let i = focusStart; i < focusEnd - 1; i++) {
	const jump = Math.abs(samples[i+1]! - samples[i]!);
	jumps.push({ time: i / sampleRate, jump, before: samples[i]!, after: samples[i+1]! });
}

jumps.sort((a, b) => b.jump - a.jump);
for (const j of jumps.slice(0, 20)) {
	console.log(`  ${j.time.toFixed(5)}s: jump=${j.jump.toFixed(6)} (${j.before.toFixed(6)} -> ${j.after.toFixed(6)})`);
}
