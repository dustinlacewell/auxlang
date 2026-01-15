/**
 * Debug: Test what each poly voice extracts
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { extractPositionsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

const pattern = "{c4,e4,g4}(3,8)";
const expr = parseExpr(pattern);
const monoExprs = decomposePattern(expr, "isolate");

console.log(`Pattern: "${pattern}"`);
console.log(`Voices: ${monoExprs.length}`);
console.log("");

// Check what each voice extracts at beat 0.125 (first euclidean hit)
const beatPos = 0.125;
console.log(`=== Extraction at beat ${beatPos} (first euclidean hit) ===`);

for (let i = 0; i < monoExprs.length; i++) {
	const monoExpr = monoExprs[i]!;
	const state = createTraversalState();
	const positions = extractPositionsForBeat(monoExpr, pattern, beatPos, 0, state);

	console.log(`\nVoice ${i}:`);
	console.log(`  Expr: ${JSON.stringify(monoExpr)}`);
	console.log(`  Positions:`, positions.map(p => `"${pattern.slice(p.start, p.end)}" [${p.start}:${p.end}]`));
}
