/**
 * Debug: does spread have the same internal node bug as pan?
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

console.log("=== Spread with poly input (3 voices) ===");
reset();
runCode(`saw([220, 330, 440]).spread().out()`, api);
const graph = collect();

console.log("Before expansion:");
for (const n of graph.nodes) {
	console.log(`  ${n.id}: ${n.device}`);
}

const expanded = expandPoly(graph);
console.log("\nAfter expansion:");
for (const n of expanded.nodes) {
	console.log(`  ${n.id}: ${n.device}`);
	for (const [k, v] of Object.entries(n.inputs)) {
		console.log(`    ${k}: ${JSON.stringify(v)}`);
	}
}

// Check for dangling references
console.log("\nChecking for dangling references...");
const nodeIds = new Set(expanded.nodes.map(n => n.id));
let danglingCount = 0;
for (const n of expanded.nodes) {
	for (const [key, value] of Object.entries(n.inputs)) {
		if (typeof value === "object" && value !== null && "ref" in value) {
			const ref = (value as { ref: string }).ref;
			if (!nodeIds.has(ref)) {
				console.log(`  DANGLING: ${n.id}.${key} references ${ref} which doesn't exist!`);
				danglingCount++;
			}
		}
	}
}
if (danglingCount === 0) {
	console.log("  No dangling references found.");
}
