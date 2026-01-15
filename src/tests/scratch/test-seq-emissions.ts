/**
 * Debug: What does seq emit across a full beat cycle?
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { extractActiveIdsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

const pattern = "{c4,e4,g4}(3,8)";
const expr = parseExpr(pattern);

console.log(`Pattern: "${pattern}"`);
console.log("");
console.log("What IDs are active at each step of the euclidean?");
console.log("");

let lastIds = "";

// Check each euclidean step (8 steps in 1 beat)
for (let step = 0; step < 8; step++) {
	const beatPos = step / 8;
	const state = createTraversalState();
	const ids = extractActiveIdsForBeat(expr, pattern, beatPos, 0, state);
	const idsKey = ids.join(",");

	const changed = idsKey !== lastIds;
	lastIds = idsKey;

	const texts = ids.map(id => {
		const [start, end] = id.split(":").map(Number);
		return pattern.slice(start!, end!);
	});

	console.log(`Step ${step} (beat ${beatPos.toFixed(3)}): [${texts.join(", ")}]${changed ? " <-- CHANGED" : ""}`);
}
