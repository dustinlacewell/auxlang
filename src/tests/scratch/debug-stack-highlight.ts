/**
 * Debug: Stack pattern highlighting issue
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import { countBeats } from "@/core2/devices/seq/expr/traverse";
import { extractPositionsForBeat } from "@/core2/devices/seq/extract-beat-positions";
import { findSeqPatterns } from "@/core2/eval/source-map";

// Test the source map pattern finding
const code = `clock(60).seq("{c4,e4,g4}")`;
console.log("Code:", code);
console.log("Found patterns:", findSeqPatterns(code));

// Test pattern parsing and extraction
const pattern = "{c4,e4,g4}";
const expr = parseExpr(pattern);
console.log("\nPattern:", pattern);
console.log("Expr type:", expr.type);
console.log("Total beats:", countBeats(expr));

// Test extraction at various beat positions
for (const beatPos of [0, 0.25, 0.5, 0.75, 0.99]) {
	const positions = extractPositionsForBeat(expr, pattern, beatPos, 0);
	console.log(`Beat ${beatPos}:`, positions.map(p => pattern.slice(p.start, p.end)));
}

// Compare with a multi-beat pattern
const pattern2 = "{c4,e4,g4} {d4,f4}";
const expr2 = parseExpr(pattern2);
console.log("\nPattern2:", pattern2);
console.log("Total beats:", countBeats(expr2));
for (const beatPos of [0, 0.5, 1, 1.5]) {
	const positions = extractPositionsForBeat(expr2, pattern2, beatPos, 0);
	console.log(`Beat ${beatPos}:`, positions.map(p => pattern2.slice(p.start, p.end)));
}
