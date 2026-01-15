/**
 * Debug: Check all euclidean hits and which voice IDs they emit
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { extractActiveIdsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";
import { euclidean } from "@/core2/devices/seq/traverse/euclidean";

const pattern = "{c4,e4,g4}(3,8)";
const patternStart = 16;  // Simulate document position

const expr = parseExpr(pattern);
const monoExprs = decomposePattern(expr, "isolate");

console.log(`Pattern: "${pattern}"`);
console.log(`Voices: ${monoExprs.length}`);
console.log(`Euclidean(3,8):`, euclidean(3, 8));
console.log("");

// Check each euclidean step
for (let step = 0; step < 8; step++) {
	const beatPos = step / 8;
	const eucPattern = euclidean(3, 8);
	const isHit = eucPattern[step];

	if (!isHit) {
		console.log(`Step ${step} (beat ${beatPos.toFixed(3)}): REST`);
		continue;
	}

	console.log(`Step ${step} (beat ${beatPos.toFixed(3)}): HIT`);

	// Get IDs from each voice
	for (let v = 0; v < monoExprs.length; v++) {
		const monoExpr = monoExprs[v]!;
		const state = createTraversalState();
		const relativeIds = extractActiveIdsForBeat(monoExpr, pattern, beatPos, 0, state);

		const absoluteIds = relativeIds.map(id => {
			const parts = id.split(":").map(Number);
			const start = parts[0] ?? 0;
			const end = parts[1] ?? 0;
			return `${patternStart + start}:${patternStart + end}`;
		});

		// Map IDs to text
		const texts = relativeIds.map(id => {
			const parts = id.split(":").map(Number);
			return pattern.slice(parts[0] ?? 0, parts[1] ?? 0);
		});

		if (absoluteIds.length > 0) {
			console.log(`  Voice ${v}: ${texts.join(", ")}`);
		}
	}
	console.log("");
}
