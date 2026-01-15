/**
 * Debug: Test cursor active element tracking (simplified model)
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { createCursor } from "@/core2/devices/seq/cursor/create";
import { sampleCursor } from "@/core2/devices/seq/cursor/sample";

// Test pattern with contiguous events
const pattern = "[c4 e4 g4]";
const expr = parseExpr(pattern);
const cursor = createCursor(expr);

const samplesPerBeat = 1000;

console.log(`Pattern: "${pattern}"`);
console.log(`Events:`, cursor.events.map(e => ({
	freq: e.freq.toFixed(0),
	start: e.start.toFixed(3),
	end: e.end.toFixed(3),
	srcStart: e.srcStart,
	srcEnd: e.srcEnd,
})));
console.log("");

// Track active state changes
let lastActiveIndex = -1;
console.log("Processing samples (showing state changes)...");
for (let sample = 0; sample < samplesPerBeat; sample++) {
	const output = sampleCursor(cursor, sample, samplesPerBeat);

	if (cursor.activeEventIndex !== lastActiveIndex) {
		const activeEvent = cursor.activeEventIndex >= 0 ? cursor.events[cursor.activeEventIndex] : null;
		const activeText = activeEvent && activeEvent.srcStart !== undefined && activeEvent.srcEnd !== undefined
			? `"${pattern.slice(activeEvent.srcStart, activeEvent.srcEnd)}"`
			: "none";
		console.log(`Sample ${sample}: activeEventIndex=${cursor.activeEventIndex} (${activeText}) gate=${output.gate}`);
		lastActiveIndex = cursor.activeEventIndex;
	}
}

// Test euclidean pattern with gaps
console.log("\n--- Euclidean pattern ---");
const pattern2 = "c4(3,8)";
const expr2 = parseExpr(pattern2);
const cursor2 = createCursor(expr2);

console.log(`Pattern: "${pattern2}"`);
console.log(`Events:`, cursor2.events.map(e => ({
	start: e.start.toFixed(3),
	end: e.end.toFixed(3),
})));
console.log("");

lastActiveIndex = -1;
console.log("Processing samples (showing state changes)...");
for (let sample = 0; sample < samplesPerBeat; sample++) {
	const output = sampleCursor(cursor2, sample, samplesPerBeat);

	if (cursor2.activeEventIndex !== lastActiveIndex) {
		const state = cursor2.activeEventIndex >= 0 ? "ON" : "OFF";
		console.log(`Sample ${sample}: ${state} (activeEventIndex=${cursor2.activeEventIndex}) gate=${output.gate}`);
		lastActiveIndex = cursor2.activeEventIndex;
	}
}
