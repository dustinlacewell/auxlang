/**
 * Debug: Compare registered IDs vs activated IDs
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { extractAllElements } from "@/core2/devices/seq/visitors/extract-all-elements";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { extractActiveIdsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

const pattern = "{c4,e4,g4}(3,8)";
const expr = parseExpr(pattern);

console.log(`Pattern: "${pattern}"`);
console.log("");

// Registration (from full pattern)
console.log("=== REGISTRATION (from full pattern) ===");
const allElements = extractAllElements(expr);
for (const elem of allElements) {
	const text = pattern.slice(elem.start, elem.end);
	console.log(`  ID: "seq1:${elem.id}" -> "${text}" (kind: ${elem.kind})`);
}

// Activation (from decomposed voices)
console.log("");
console.log("=== ACTIVATION (from decomposed voices at beat 0.125) ===");
const monoExprs = decomposePattern(expr, "isolate");
const beatPos = 0.125;

const allActiveIds = new Set<string>();
for (let i = 0; i < monoExprs.length; i++) {
	const monoExpr = monoExprs[i]!;
	const state = createTraversalState();
	const ids = extractActiveIdsForBeat(monoExpr, pattern, beatPos, 0, state);
	for (const id of ids) {
		allActiveIds.add(`seq1:${id}`);
	}
}

console.log("Active IDs:", [...allActiveIds]);

// Check match
console.log("");
console.log("=== MATCH CHECK ===");
const registeredIds = new Set(allElements.map(e => `seq1:${e.id}`));
for (const activeId of allActiveIds) {
	const found = registeredIds.has(activeId);
	const text = allElements.find(e => `seq1:${e.id}` === activeId);
	console.log(`  ${activeId}: ${found ? "✓ FOUND" : "✗ NOT FOUND"} -> "${text ? pattern.slice(text.start, text.end) : "?"}"`);
}
