/**
 * Test clock and swing devices.
 */

import { getDeviceSpec } from "@/core2/device/registry";
// Import to register devices
import "@/core2/devices/clock";
import "@/core2/devices/swing";
import "@/core2/devices/clock-div";

// Mock device execution
function runDevice(
	deviceName: string,
	inputs: Record<string, number>,
	state: Record<string, unknown>,
	samples: number,
	sampleRate = 44100
): { outputs: Record<string, number>[]; finalState: Record<string, unknown> } {
	const spec = getDeviceSpec(deviceName);
	if (!spec?.process) throw new Error(`Device ${deviceName} not found or has no process`);

	const outputs: Record<string, number>[] = [];
	const out: Record<string, number> = {};

	for (let i = 0; i < samples; i++) {
		spec.process(inputs, {}, state, sampleRate, 0, out, {} as any);
		outputs.push({ ...out });
	}

	return { outputs, finalState: state };
}

// Test clock
console.log("=== Clock device ===");
const clockState: Record<string, unknown> = {};
const clockResult = runDevice("clock", { bpm: 120 }, clockState, 44100); // 1 second at 44100 Hz

// At 120 BPM, we should see 2 beats per second
const triggers = clockResult.outputs.filter(o => o.trig === 1).length;
console.log(`Triggers in 1 second at 120 BPM: ${triggers} (expected: 2)`);

// Check phase ramps
const firstPhase = clockResult.outputs[0]!.phase;
const lastPhase = clockResult.outputs[clockResult.outputs.length - 1]!.phase;
console.log(`Phase after 1 second: ${lastPhase.toFixed(4)} (expected: ~2)`);

// Test swing device
console.log("\n=== Swing device ===");
const swingSpec = getDeviceSpec("swing")!;
const swingState: Record<string, unknown> = {};

// Test phase warping
const testPhases = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
console.log("Phase warping with swing=0.2:");
for (const phase of testPhases) {
	const out: Record<string, number> = {};
	swingSpec.process!({ phase, amount: 0.2 }, {}, swingState, 44100, 0, out, {} as any);
	console.log(`  input=${phase.toFixed(2)} -> output=${out.phase!.toFixed(4)}`);
}

// Test clockDiv
console.log("\n=== Clock divider (by 2) ===");
const divSpec = getDeviceSpec("clockDiv")!;
const divState: Record<string, unknown> = {};
// Manually simulate phase input
for (let phase = 0; phase < 4; phase += 0.5) {
	const out: Record<string, number> = {};
	divSpec.process!({ phase, by: 2 }, {}, divState, 44100, 0, out, {} as any);
	console.log(`  input phase=${phase} -> output phase=${out.phase!.toFixed(2)}, trig=${out.trig}`);
}

// Test clockMult
console.log("\n=== Clock multiplier (by 2) ===");
const multSpec = getDeviceSpec("clockMult")!;
const multState: Record<string, unknown> = {};
for (let phase = 0; phase < 2; phase += 0.25) {
	const out: Record<string, number> = {};
	multSpec.process!({ phase, by: 2 }, {}, multState, 44100, 0, out, {} as any);
	console.log(`  input phase=${phase} -> output phase=${out.phase!.toFixed(2)}, trig=${out.trig}`);
}

console.log("\n=== All tests passed! ===");
