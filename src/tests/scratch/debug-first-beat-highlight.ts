/**
 * Debug: Why doesn't the first beat show highlights?
 * 
 * Simulates the seq device process function to trace decoration emission.
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import { countBeats } from "@/core2/devices/seq/expr/traverse";
import { extractPositionsForBeat } from "@/core2/devices/seq/extract-beat-positions";
import { createCursor } from "@/core2/devices/seq/cursor/create";
import { resetCursor, stepCursor } from "@/core2/devices/seq/cursor/step";
import { sampleCursor } from "@/core2/devices/seq/cursor/sample";

// Test stack/chord handling
const stackPattern = "{c4,e4,g4} {d4,f4} a4";
const stackExpr = parseExpr(stackPattern);
console.log("Stack pattern:", stackPattern);
console.log("Stack positions at beat 0:", extractPositionsForBeat(stackExpr, stackPattern, 0, 0).map(p => ({
	text: stackPattern.slice(p.start, p.end),
	type: p.type
})));
console.log("Stack positions at beat 1:", extractPositionsForBeat(stackExpr, stackPattern, 1, 0).map(p => ({
	text: stackPattern.slice(p.start, p.end),
	type: p.type
})));
console.log("Stack positions at beat 2:", extractPositionsForBeat(stackExpr, stackPattern, 2, 0).map(p => ({
	text: stackPattern.slice(p.start, p.end),
	type: p.type
})));
console.log("");

const pattern = "[c4 e4] [g4 c5] e4 c4";
const expr = parseExpr(pattern);
const totalBeats = countBeats(expr);

console.log("Pattern:", pattern);
console.log("Total beats:", totalBeats);

// Simulate clock signals
const sampleRate = 44100;
const bpm = 120;
const samplesPerBeat = (60 / bpm) * sampleRate;

console.log("Samples per beat:", samplesPerBeat);

// Create cursor
const cursor = createCursor(expr);

// Simulate the first few samples
let beatIndex = -1;
let cycleCount = 0;
let samplesSinceTrig = 0;

interface SampleResult {
	sampleNum: number;
	clk: number;
	beatIndex: number;
	beatPosition: number;
	cv: number;
	positions: string[];
}

const results: SampleResult[] = [];

function simulateSample(clk: number, sampleNum: number) {
	const isReset = clk < -0.5;
	const isTrig = clk > 0.5;
	
	let justReset = false;
	
	if (isReset) {
		samplesSinceTrig = 0;
		beatIndex = 0;
		cycleCount = 0;
		justReset = true;
		resetCursor(cursor, expr);
	} else if (isTrig) {
		samplesSinceTrig = 0;
		beatIndex++;
		if (beatIndex >= totalBeats) {
			beatIndex = 0;
			cycleCount++;
		}
		stepCursor(cursor, expr, beatIndex, cycleCount);
	} else {
		samplesSinceTrig++;
	}
	
	if (beatIndex < 0) return;
	
	// Get audio output
	const output = sampleCursor(cursor, samplesSinceTrig, samplesPerBeat);
	
	// Check decoration emission conditions
	const decorationInterval = Math.floor(sampleRate / 60);
	const shouldEmitDecoration = justReset || isTrig || samplesSinceTrig % decorationInterval === 0;
	
	if (shouldEmitDecoration) {
		const beatFraction = samplesSinceTrig / samplesPerBeat;
		const beatPosition = beatIndex + beatFraction;
		const positions = extractPositionsForBeat(expr, pattern, beatPosition, cycleCount);
		
		results.push({
			sampleNum,
			clk,
			beatIndex,
			beatPosition,
			cv: output.cv,
			positions: positions.map(p => pattern.slice(p.start, p.end))
		});
	}
}

console.log("\n=== Full cycle simulation ===\n");

// Simulate a full cycle plus a bit more
const totalSamples = Math.ceil(samplesPerBeat * (totalBeats + 0.5));

for (let i = 0; i < totalSamples; i++) {
	let clk = 0;
	
	if (i === 0) {
		clk = -bpm; // Reset
	} else if (i > 0 && (i % samplesPerBeat) === 0) {
		clk = 1; // Trigger
	}
	
	simulateSample(clk, i);
}

// Print results grouped by beat
console.log("Sample | Beat | BeatPos | CV (Hz) | Highlighted");
console.log("-------|------|---------|---------|------------");

let lastBeat = -1;
for (const r of results) {
	if (r.beatIndex !== lastBeat) {
		console.log(""); // Blank line between beats
		lastBeat = r.beatIndex;
	}
	const cvNote = r.cv > 0 ? `${r.cv.toFixed(1)}` : "0";
	console.log(`${r.sampleNum.toString().padStart(6)} | ${r.beatIndex}    | ${r.beatPosition.toFixed(4).padStart(7)} | ${cvNote.padStart(7)} | ${r.positions.join(", ")}`);
}

// Analyze the issue
console.log("\n=== Analysis ===\n");

// Find first sample where c4 is highlighted vs first sample where c4 CV is output
const c4Freq = 261.63; // Approximate
const firstC4Highlight = results.find(r => r.positions.includes("c4"));
const firstC4Audio = results.find(r => Math.abs(r.cv - c4Freq) < 1);

console.log("First c4 highlight at sample:", firstC4Highlight?.sampleNum, "beatPos:", firstC4Highlight?.beatPosition);
console.log("First c4 audio at sample:", firstC4Audio?.sampleNum, "beatPos:", firstC4Audio?.beatPosition, "cv:", firstC4Audio?.cv);
