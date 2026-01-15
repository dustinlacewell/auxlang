/**
 * Debug: Test highlighting for stack+euclidean pattern
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { extractAllElements } from "@/core2/devices/seq/visitors/extract-all-elements";
import { extractPositionsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { countBeats } from "@/core2/devices/seq/traverse/count-beats";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";
import { euclidean } from "@/core2/devices/seq/traverse/euclidean";

const pattern = "{c4,e4,g4}(3,8)";

const expr = parseExpr(pattern);
const totalBeats = countBeats(expr);

console.log(`Pattern: "${pattern}"`);
console.log(`Total beats: ${totalBeats}`);
console.log(`Euclidean(3,8) pattern:`, euclidean(3, 8));
console.log("");

// Phase 1: What gets registered
console.log("=== Phase 1: extractAllElements (registration) ===");
const allElements = extractAllElements(expr);
for (const elem of allElements) {
	console.log(`  ID: "${elem.id}" -> "${pattern.slice(elem.start, elem.end)}" (kind: ${elem.kind})`);
}
console.log("");

// Phase 2: What gets activated per euclidean step
console.log("=== Phase 2: extractPositionsForBeat (per euclidean step) ===");
const state = createTraversalState();
// Euclidean (3,8) subdivides 1 beat into 8 steps
for (let step = 0; step < 8; step++) {
	const beatPos = step / 8;
	const positions = extractPositionsForBeat(expr, pattern, beatPos, 0, state);
	const eucPattern = euclidean(3, 8);
	const isHit = eucPattern[step] ? "HIT" : "rest";
	console.log(`  Step ${step} (beat ${beatPos.toFixed(3)}) [${isHit}]:`,
		positions.map(p => `"${pattern.slice(p.start, p.end)}"`).join(", ") || "(none)");
}
