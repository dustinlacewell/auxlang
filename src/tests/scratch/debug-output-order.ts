/**
 * Check if Object.keys order is consistent for node outputs
 */

// Simulate what the runtime graph does
const outputs: Record<string, number> = {};

// Initialize outputs like runtime-graph.ts does (line 145)
const specOutputs = ["audio"]; // delay has only "audio" output
for (const out of specOutputs) {
	outputs[out] = 0;
}

console.log("After initialization:");
console.log("  outputs:", outputs);
console.log("  Object.keys(outputs):", Object.keys(outputs));
console.log("  Object.keys(outputs)[0]:", Object.keys(outputs)[0]);

// After process, assign result
Object.assign(outputs, { audio: 0.5 });

console.log("\nAfter Object.assign:");
console.log("  outputs:", outputs);
console.log("  Object.keys(outputs):", Object.keys(outputs));
console.log("  Object.keys(outputs)[0]:", Object.keys(outputs)[0]);

// What if there were multiple outputs?
const multiOutputs: Record<string, number> = { cv: 0, gate: 0, trig: 0 };
console.log("\nMulti-output device:");
console.log("  Object.keys:", Object.keys(multiOutputs));
console.log("  [0]:", Object.keys(multiOutputs)[0]);
