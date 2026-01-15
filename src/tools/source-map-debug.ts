/**
 * Debug source map pattern positions.
 * Shows where findSeqPatterns locates seq() calls in source code.
 *
 * Usage:
 *   npx tsx src/tools/source-map-debug.ts
 */

import { findSeqPatterns } from "@/core2/eval/source-map";
import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { extractPositionsForBeat } from "@/core2/devices/seq/visitors/extract-positions";

// Test cases - LF vs CRLF line endings
const testCases = [
	{
		name: "LF line endings (should work)",
		code: "clock(120)\n  .seq(\"db4 eb4 gb4 ab4\")\n  .sin()\n  .gain(0.5)\n  .out()",
	},
	{
		name: "CRLF line endings (was broken - extra \\r chars)",
		code: "clock(120)\r\n  .seq(\"db4 eb4 gb4 ab4\")\r\n  .sin()\r\n  .gain(0.5)\r\n  .out()",
	},
	{
		name: "simple test (no newlines)",
		code: "seq(\"c4 e4 g4\").sin().out()",
	},
];

for (const { name, code } of testCases) {
	console.log(`\n=== ${name} ===`);
	console.log("Code:");
	console.log(code);
	console.log("\nWith positions marked:");

	// Show character positions
	const lines = code.split("\n");
	let charIndex = 0;
	for (const line of lines) {
		const lineStart = charIndex;
		console.log(`${String(lineStart).padStart(3)}: ${line}`);
		charIndex += line.length + 1; // +1 for newline
	}

	console.log("\nfindSeqPatterns results:");
	const patterns = findSeqPatterns(code);

	for (const p of patterns) {
		const extracted = code.slice(p.patternStart, p.patternEnd);
		console.log(`  ${p.nodeId}:`);
		console.log(`    patternStart: ${p.patternStart}`);
		console.log(`    patternEnd: ${p.patternEnd}`);
		console.log(`    pattern: "${p.pattern}"`);
		console.log(`    extracted: "${extracted}"`);
		console.log(`    match: ${p.pattern === extracted}`);

		// Show surrounding context
		const contextStart = Math.max(0, p.patternStart - 5);
		const contextEnd = Math.min(code.length, p.patternEnd + 5);
		const before = code.slice(contextStart, p.patternStart);
		const after = code.slice(p.patternEnd, contextEnd);
		console.log(`    context: "${before}[${extracted}]${after}"`);

		// Now show what beat 0 decoration positions would be
		console.log("\n    Beat 0 decorations (final positions):");
		try {
			const expr = parseExpr(p.pattern);
			const positions = extractPositionsForBeat(expr, p.pattern, 0, 0);
			for (const pos of positions) {
				const absoluteStart = p.patternStart + pos.start;
				const absoluteEnd = p.patternStart + pos.end;
				const highlighted = code.slice(absoluteStart, absoluteEnd);
				const expected = p.pattern.slice(pos.start, pos.end);
				console.log(`      ${pos.noteId}: [${absoluteStart}:${absoluteEnd}] = "${highlighted}" (expected: "${expected}")`);
			}
		} catch (e) {
			console.log(`      Error: ${e}`);
		}
	}
}
