/**
 * Debug: Simulate seq device with single-beat stack pattern
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { countBeats } from "@/core2/devices/seq/traverse/count-beats";
import { extractPositionsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createCursor } from "@/core2/devices/seq/cursor/create";
import { resetCursor, stepCursor } from "@/core2/devices/seq/cursor/step";

const pattern = "{c4,e4,g4}";
const expr = parseExpr(pattern);
const totalBeats = countBeats(expr);

console.log("Pattern:", pattern);
console.log("Total beats:", totalBeats);

const sampleRate = 44100;
const bpm = 60;
const samplesPerBeat = (60 / bpm) * sampleRate; // 44100 samples per beat at 60 BPM

console.log("Samples per beat:", samplesPerBeat);

const cursor = createCursor(expr);

let beatIndex = -1;
let cycleCount = 0;
let samplesSinceTrig = 0;
let decorationCount = 0;

// Simulate first few seconds - check the sample BEFORE each trigger too
for (let sample = 0; sample < samplesPerBeat * 3; sample++) {
	// Log the sample right before trigger
	if (sample > 0 && (sample + 1) % samplesPerBeat === 0) {
		const preBeatFraction = (samplesSinceTrig + 1) / samplesPerBeat;
		const preBeatPosition = beatIndex + preBeatFraction;
		console.log(`Sample ${sample} (pre-trigger): beatIdx=${beatIndex}, beatPos=${preBeatPosition.toFixed(6)}`);
	}
	let clk = 0;
	let justReset = false;
	
	if (sample === 0) {
		clk = -bpm; // Reset
	} else if (sample > 0 && sample % samplesPerBeat === 0) {
		clk = 1; // Trigger
	}
	
	const isReset = clk < -0.5;
	const isTrig = clk > 0.5;
	
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
	
	if (beatIndex < 0) continue;
	
	// Check decoration emission
	const decorationInterval = Math.floor(sampleRate / 60);
	const shouldEmitDecoration = justReset || isTrig || samplesSinceTrig % decorationInterval === 0;
	
	if (shouldEmitDecoration) {
		const beatFraction = samplesSinceTrig / samplesPerBeat;
		const beatPosition = beatIndex + beatFraction;
		const positions = extractPositionsForBeat(expr, pattern, beatPosition, cycleCount);
		
		decorationCount++;
		
		// Log all emissions with 0 positions, or first few
		if (positions.length === 0 || decorationCount <= 5 || justReset || isTrig) {
			console.log(`Sample ${sample}: beatIdx=${beatIndex}, beatPos=${beatPosition.toFixed(4)}, positions=${positions.length}, cycle=${cycleCount}`);
		}
	}
}

console.log(`\nTotal decoration emissions: ${decorationCount}`);
