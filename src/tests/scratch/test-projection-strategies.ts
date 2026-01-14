/**
 * Test projection strategies for voice decomposition.
 */

import { parseExpr } from "../../core2/devices/seq/ast/parse";
import { voiceCount } from "../../core2/devices/seq/voices/count";
import { decomposePattern } from "../../core2/devices/seq/voices/decompose";
import { projectVoice } from "../../core2/devices/seq/voices/project";
import type { ProjectionStrategy } from "../../core2/devices/seq/voices/types";

function exprToString(expr: any): string {
	switch (expr.type) {
		case "note":
			return expr.pitch;
		case "rest":
			return "~";
		case "seq":
			return expr.children.map(exprToString).join(" ");
		case "group":
			return `[${expr.children.map(exprToString).join(" ")}]`;
		case "stack":
			return `{${expr.children.map(exprToString).join(", ")}}`;
		case "alt":
			return `<${expr.children.map(exprToString).join(" ")}>`;
		case "tie":
			return expr.children.map(exprToString).join("_");
		case "multiply":
			return `${exprToString(expr.child)}*${expr.count}`;
		case "replicate":
			return `${exprToString(expr.child)}!${expr.count}`;
		case "elongate":
			return `${exprToString(expr.child)}@${expr.count}`;
		default:
			return `<${expr.type}>`;
	}
}

function testPattern(pattern: string, strategy: ProjectionStrategy) {
	console.log(`\n=== Pattern: "${pattern}" (${strategy}) ===`);
	const expr = parseExpr(pattern);
	const count = voiceCount(expr, strategy);
	console.log(`Voice count: ${count}`);

	const voices = decomposePattern(expr, strategy);
	for (let i = 0; i < voices.length; i++) {
		console.log(`  Voice ${i}: ${exprToString(voices[i])}`);
	}
}

// Test case: [c4 {e4, g4} e4]
// Expected with "isolate":
//   Voice 0: [c4 ~ e4]
//   Voice 1: [~ e4 ~]
//   Voice 2: [~ g4 ~]

console.log("Testing projection strategies...\n");

// Simple stack
testPattern("{c4, e4}", "duplicate");
testPattern("{c4, e4}", "isolate");

// Stack in group
testPattern("[c4 {e4, g4} e4]", "duplicate");
testPattern("[c4 {e4, g4} e4]", "isolate");

// Nested stacks
testPattern("{a4, {b4, c5}}", "duplicate");
testPattern("{a4, {b4, c5}}", "isolate");

// Complex pattern
testPattern("{c3!4, [c4 {e4, g4} e4], ~ ~ ~ g4}", "duplicate");
testPattern("{c3!4, [c4 {e4, g4} e4], ~ ~ ~ g4}", "isolate");

console.log("\n✓ Done");
