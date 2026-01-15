/**
 * Verify registration and activation IDs match using absolute document positions
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import { extractAllElements } from "@/core2/devices/seq/visitors/extract-all-elements";
import { decomposePattern } from "@/core2/devices/seq/voices/decompose";
import { extractActiveIdsForBeat } from "@/core2/devices/seq/visitors/extract-positions";
import { createTraversalState } from "@/core2/devices/seq/traverse/types";

// Simulate a document with seq at position 17: `clock(120).seq("{c4,e4,g4}(3,8)")`
const docPrefix = 'clock(120).seq("';
const pattern = "{c4,e4,g4}(3,8)";
const patternStart = docPrefix.length;  // Where the pattern starts in the document

console.log(`Pattern: "${pattern}"`);
console.log(`Pattern starts at document position: ${patternStart}`);
console.log("");

// Registration: Extract all elements with absolute positions
console.log("=== REGISTRATION (absolute document positions) ===");
const expr = parseExpr(pattern);
const allElements = extractAllElements(expr);
const registeredIds = new Set<string>();
for (const elem of allElements) {
	const absoluteFrom = patternStart + elem.start;
	const absoluteTo = patternStart + elem.end;
	const id = `${absoluteFrom}:${absoluteTo}`;
	registeredIds.add(id);
	const text = pattern.slice(elem.start, elem.end);
	console.log(`  ID: "${id}" -> "${text}" (kind: ${elem.kind})`);
}

// Activation: Get IDs from each poly voice and convert to absolute
console.log("");
console.log("=== ACTIVATION at beat 0.125 (first euclidean hit) ===");
const monoExprs = decomposePattern(expr, "isolate");
const beatPos = 0.125;

const allActiveIds = new Set<string>();
for (let i = 0; i < monoExprs.length; i++) {
	const monoExpr = monoExprs[i]!;
	const state = createTraversalState();
	const relativeIds = extractActiveIdsForBeat(monoExpr, pattern, beatPos, 0, state);

	// Convert relative to absolute (simulating what seq.ts does)
	const absoluteIds = relativeIds.map(id => {
		const parts = id.split(":").map(Number);
		const start = parts[0] ?? 0;
		const end = parts[1] ?? 0;
		return `${patternStart + start}:${patternStart + end}`;
	});

	console.log(`Voice ${i}: ${absoluteIds.map(id => `"${id}"`).join(", ") || "(none)"}`);
	for (const id of absoluteIds) {
		allActiveIds.add(id);
	}
}

// Check match
console.log("");
console.log("=== MATCH CHECK ===");
console.log(`Registered IDs: ${registeredIds.size}`);
console.log(`Active IDs: ${allActiveIds.size}`);

for (const activeId of allActiveIds) {
	const found = registeredIds.has(activeId);
	const [from, to] = activeId.split(":").map(Number);
	const relStart = (from ?? 0) - patternStart;
	const relEnd = (to ?? 0) - patternStart;
	const text = pattern.slice(relStart, relEnd);
	console.log(`  ${activeId}: ${found ? "✓ FOUND" : "✗ NOT FOUND"} -> "${text}"`);
}
