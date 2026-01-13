/**
 * Debug ADSR + gain chain to see actual values
 */

import { adsr } from "../../core2/devices/adsr";
import { gain } from "../../core2/devices/gain";
import { saw } from "../../core2/devices/saw";

const sampleRate = 48000;

// Simulate ADSR with short envelope
const adsrState: Record<string, unknown> = {};
const adsrInputs = {
	gate: 1, // Gate ON
	attack: 0.01,
	decay: 0.01,
	sustain: 0.02,
	release: 0.01,
};

console.log("ADSR output over time (gate ON for entire duration):");
console.log("Time (ms) | ADSR Level | Stage");
console.log("----------|------------|------");

// Run for 100ms
for (let sample = 0; sample < sampleRate * 0.1; sample++) {
	const result = adsr.process(adsrInputs, {}, adsrState, sampleRate);

	// Print every 5ms
	if (sample % (sampleRate * 0.005) === 0) {
		const timeMs = (sample / sampleRate * 1000).toFixed(1);
		const level = (result.cv as number).toFixed(4);
		const stage = adsrState.stage as string;
		console.log(`${timeMs.padStart(9)} | ${level.padStart(10)} | ${stage}`);
	}
}

console.log("\n\nNow testing full chain: saw -> gain(level=adsr) at t=50ms");
console.log("At t=50ms, ADSR should be in sustain at 0.02\n");

// Reset ADSR state
const adsrState2: Record<string, unknown> = {};
const sawState: Record<string, unknown> = {};
const gainState: Record<string, unknown> = {};

// Run to t=50ms
for (let sample = 0; sample < sampleRate * 0.05; sample++) {
	adsr.process(adsrInputs, {}, adsrState2, sampleRate);
}

console.log("ADSR state at t=50ms:", adsrState2);

// Now check a few samples
console.log("\nSample outputs at t=50ms:");
for (let i = 0; i < 10; i++) {
	const sawOut = saw.process({ freq: 82.41 }, {}, sawState, sampleRate); // E2
	const adsrOut = adsr.process(adsrInputs, {}, adsrState2, sampleRate);
	const gainOut = gain.process(
		{ input: sawOut.signal, level: adsrOut.cv },
		{},
		gainState,
		sampleRate
	);

	console.log(`  saw=${(sawOut.signal as number).toFixed(4)}, adsr=${(adsrOut.cv as number).toFixed(4)}, gain=${(gainOut.signal as number).toFixed(4)}`);
}
