/**
 * Debug: Test what IDs each voice emits
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { extractActiveIdsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

const pattern = "{c4,e4,g4}(3,8)";
const expr = parseExpr(pattern);
const monoExprs = decomposePattern(expr, "isolate");

console.log(`Pattern: "${pattern}"`);
console.log(`Voices: ${monoExprs.length}`);
console.log("");

// Check what IDs each voice emits at beat 0.125 (first euclidean hit)
const beatPos = 0.125;
console.log(`=== IDs at beat ${beatPos} (first euclidean hit) ===`);

const allIds: string[] = [];
for (let i = 0; i < monoExprs.length; i++) {
	const monoExpr = monoExprs[i]!;
	const state = createTraversalState();
	const ids = extractActiveIdsForBeat(monoExpr, pattern, beatPos, 0, state);
	console.log(`Voice ${i}: [${ids.map(id => `"${id}"`).join(", ")}]`);

	// Simulate what main thread does: prefix with nodeId
	const primaryNodeId = "seq1"; // All voices use primary
	const prefixedIds = ids.map(id => `${primaryNodeId}:${id}`);
	allIds.push(...prefixedIds);
}

console.log("");
console.log("All IDs (accumulated):", allIds);
console.log("Unique IDs:", [...new Set(allIds)]);
