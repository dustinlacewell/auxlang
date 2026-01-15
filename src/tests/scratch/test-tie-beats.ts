/**
 * Test that ties work correctly:
 * 1. c4_e4_g4 should span 3 beats (same as c4 e4 g4)
 * 2. Gate should stay open through tied notes
 */

import { parseExpr } from "../../core2/devices/seq/ast/parse";
import { countBeats } from "../../core2/devices/seq/traverse/count-beats";
import { collectBeatEvents } from "../../core2/devices/seq/visitors/collect-events";
import type { TraversalState } from "../../core2/devices/seq/traverse/types";

// Test 1: Beat counting
const tied = parseExpr("c4_e4_g4");
const seq = parseExpr("c4 e4 g4");

console.log("=== Beat Counting ===");
console.log(`c4_e4_g4 beats: ${countBeats(tied)} (should be 3)`);
console.log(`c4 e4 g4 beats: ${countBeats(seq)} (should be 3)`);

// Test 2: Event collection - check isTrigger for tied notes
console.log("\n=== Event Collection for tied pattern ===");
const state: TraversalState = { probDecisions: {}, altPositions: {} };

for (let beat = 0; beat < 3; beat++) {
	const events = collectBeatEvents(tied, beat, state, 0);
	console.log(`Beat ${beat}:`, events.map(e => ({
		freq: e.freq.toFixed(0),
		start: e.start.toFixed(2),
		end: e.end.toFixed(2),
		isTrigger: e.isTrigger
	})));
}

// Test 3: Compare with sequence
console.log("\n=== Event Collection for separate pattern ===");
const state2: TraversalState = { probDecisions: {}, altPositions: {} };

for (let beat = 0; beat < 3; beat++) {
	const events = collectBeatEvents(seq, beat, state2, 0);
	console.log(`Beat ${beat}:`, events.map(e => ({
		freq: e.freq.toFixed(0),
		start: e.start.toFixed(2),
		end: e.end.toFixed(2),
		isTrigger: e.isTrigger
	})));
}

// Test 4: Mixed pattern - should have 6 beats total
const mixed = parseExpr("c4_e4_g4 c4 e4 g4");
console.log("\n=== Mixed pattern 'c4_e4_g4 c4 e4 g4' ===");
console.log(`Total beats: ${countBeats(mixed)} (should be 6)`);
