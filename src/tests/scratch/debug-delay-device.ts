/**
 * Test delay device directly with known input
 */

import { getDeviceSpec } from "../../core2/device/registry";

const spec = getDeviceSpec("delay")!;
const sampleRate = 48000;
const state: Record<string, unknown> = {};

// Delay params
const time = 0.23;
const feedback = 0.1;
const mix = 0.5;

// Generate input: plucky sin wave (100ms attack/decay envelope)
function generateInput(sample: number): number {
	const t = sample / sampleRate;
	const freq = 261.63; // C4

	// Simple envelope: attack 10ms, decay to 0.5 over 300ms, then release over 100ms after 1s
	let env = 0;
	if (t < 0.01) {
		env = t / 0.01; // attack
	} else if (t < 0.3) {
		env = 1 - (t - 0.01) / 0.29 * 0.5; // decay to 0.5
	} else if (t < 1.0) {
		env = 0.5; // sustain
	} else if (t < 1.1) {
		env = 0.5 * (1 - (t - 1.0) / 0.1); // release
	} else {
		env = 0;
	}

	const osc = Math.sin(2 * Math.PI * freq * t);
	return osc * env;
}

const totalSamples = 4 * sampleRate;
const outputs: number[] = [];

for (let i = 0; i < totalSamples; i++) {
	const input = generateInput(i);

	const result = spec.process(
		{ input, time, feedback, mix },
		{},
		state,
		sampleRate
	);

	outputs.push(result.audio as number);
}

// Analyze
console.log("=== Delay Device Test ===\n");
console.log(`time=${time}, feedback=${feedback}, mix=${mix}\n`);

console.log("RMS per 250ms:");
const windowSamples = Math.floor(0.25 * sampleRate);
for (let w = 0; w < 16; w++) {
	const start = w * windowSamples;
	const end = Math.min(start + windowSamples, outputs.length);
	if (start >= outputs.length) break;

	let sum = 0;
	let peak = 0;
	for (let i = start; i < end; i++) {
		sum += outputs[i] * outputs[i];
		peak = Math.max(peak, Math.abs(outputs[i]));
	}
	const rms = Math.sqrt(sum / (end - start));
	const bar = "█".repeat(Math.floor(rms * 80));
	console.log(`  ${(w * 250).toString().padStart(4)}ms: ${rms.toFixed(6)} ${bar}`);
}

// Check last second
console.log("\nLast second:");
const lastSecond = outputs.slice(-sampleRate);
let lastSum = 0;
let lastPeak = 0;
for (const v of lastSecond) {
	lastSum += v * v;
	lastPeak = Math.max(lastPeak, Math.abs(v));
}
console.log(`  RMS: ${Math.sqrt(lastSum / lastSecond.length).toExponential(4)}`);
console.log(`  Peak: ${lastPeak.toExponential(4)}`);

// Check delay buffer
const buf = state.buffer as Float32Array;
if (buf) {
	let bufRms = 0;
	let bufPeak = 0;
	for (let i = 0; i < buf.length; i++) {
		bufRms += buf[i] * buf[i];
		bufPeak = Math.max(bufPeak, Math.abs(buf[i]));
	}
	console.log(`\nDelay buffer:`);
	console.log(`  RMS: ${Math.sqrt(bufRms / buf.length).toExponential(4)}`);
	console.log(`  Peak: ${bufPeak.toExponential(4)}`);
}
