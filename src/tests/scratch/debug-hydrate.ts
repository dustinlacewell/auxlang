/**
 * Test: Does serializing and hydrating the delay process function change its behavior?
 */

import "../../core2/devices/delay"; // registers the device
import { getDeviceSpec } from "../../core2/device/registry";
import { hydrateFunction } from "../../core2/runtime/hydrate-function";

const spec = getDeviceSpec("delay")!;

// Original function
const original = spec.process;

// Serialize like toWorkletGraph does
const serialized = spec.process.toString();
console.log("=== Serialized process function ===");
console.log(serialized);
console.log("\n");

const hydrated = hydrateFunction(serialized);

// Test both with same inputs
const sampleRate = 48000;
const state1: Record<string, unknown> = {};
const state2: Record<string, unknown> = {};

const inputs = { input: 0.5, time: 0.23, feedback: 0.1, mix: 0.5 };
const config = {};

console.log("=== Comparing outputs ===");

// Run 100 samples with original
for (let i = 0; i < 100; i++) {
	original(inputs, config, state1, sampleRate);
}

// Run 100 samples with hydrated
for (let i = 0; i < 100; i++) {
	(hydrated as any)(inputs, config, state2, sampleRate);
}

console.log("State after 100 samples:");
console.log("  Original writeIndex:", state1.writeIndex);
console.log("  Hydrated writeIndex:", state2.writeIndex);

// Check buffers match
const buf1 = state1.buffer as Float32Array;
const buf2 = state2.buffer as Float32Array;

let match = true;
for (let i = 0; i < 1000; i++) {
	if (buf1[i] !== buf2[i]) {
		console.log(`  Mismatch at ${i}: ${buf1[i]} vs ${buf2[i]}`);
		match = false;
		break;
	}
}
if (match) {
	console.log("  Buffers match!");
}
