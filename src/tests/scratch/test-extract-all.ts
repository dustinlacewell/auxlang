/**
 * Debug: Compare extractAllElements vs extractActiveIdsForBeat
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { extractAllElements } from "@/core2/devices/seq/visitors/extract-all-elements";
import { extractActiveIdsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { countBeats } from "@/core2/devices/seq/traverse/count-beats";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

const pattern = "c4 e4 g4";

const expr = parseExpr(pattern);
const totalBeats = countBeats(expr);

console.log(`Pattern: "${pattern}"`);
console.log(`Total beats: ${totalBeats}`);
console.log("");

// Phase 1: What gets registered
console.log("=== Phase 1: extractAllElements (registration) ===");
const allElements = extractAllElements(expr);
for (const elem of allElements) {
	console.log(`  ID: "${elem.id}" -> "${pattern.slice(elem.start, elem.end)}" (kind: ${elem.kind})`);
}
console.log("");

// Phase 2: What gets activated per beat
console.log("=== Phase 2: extractActiveIdsForBeat (per frame) ===");
const state = createTraversalState();
for (let beat = 0; beat < totalBeats; beat++) {
	const activeIds = extractActiveIdsForBeat(expr, pattern, beat, 0, state);
	console.log(`  Beat ${beat}: [${activeIds.map(id => `"${id}"`).join(", ")}]`);
}
console.log("");

// Check for ID match
console.log("=== ID Match Check ===");
const registeredIds = new Set(allElements.map(e => e.id));
for (let beat = 0; beat < totalBeats; beat++) {
	const activeIds = extractActiveIdsForBeat(expr, pattern, beat, 0, state);
	for (const id of activeIds) {
		const found = registeredIds.has(id);
		console.log(`  Beat ${beat}, ID "${id}": ${found ? "✓ FOUND" : "✗ NOT FOUND"}`);
	}
}
