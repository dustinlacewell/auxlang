/**
 * Debug: investigate if expand-created internal nodes get added to graph
 *
 * Question: When pan.expand() creates a sumNode for poly input,
 * does that sumNode end up in the final expanded graph?
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

console.log("=== Pan with poly input (3 voices) ===");
reset();
runCode(`saw([220, 330, 440]).pan(0).out()`, api);
const graph = collect();
console.log("\nBefore expansion:");
for (const n of graph.nodes) {
	console.log(`  ${n.id}: ${n.device}`);
	for (const [k, v] of Object.entries(n.inputs)) {
		console.log(`    ${k}: ${JSON.stringify(v)}`);
	}
}

const expanded = expandPoly(graph);
console.log("\nAfter expansion:");
for (const n of expanded.nodes) {
	console.log(`  ${n.id}: ${n.device}`);
	for (const [k, v] of Object.entries(n.inputs)) {
		console.log(`    ${k}: ${JSON.stringify(v)}`);
	}
}

console.log("\nLeft outputs:", expanded.leftOutputIds);
console.log("Right outputs:", expanded.rightOutputIds);

// Look for anonymous device nodes (sumNode would be _anon*)
const anonNodes = expanded.nodes.filter(n => n.device.startsWith("_anon"));
console.log(`\nAnonymous nodes: ${anonNodes.length}`);
for (const n of anonNodes) {
	console.log(`  ${n.id}: ${n.device}`);
}

// Check if any node references an ID that doesn't exist
console.log("\nChecking for dangling references...");
const nodeIds = new Set(expanded.nodes.map(n => n.id));
for (const n of expanded.nodes) {
	for (const [key, value] of Object.entries(n.inputs)) {
		if (typeof value === "object" && value !== null && "ref" in value) {
			const ref = (value as { ref: string }).ref;
			if (!nodeIds.has(ref)) {
				console.log(`  DANGLING: ${n.id}.${key} references ${ref} which doesn't exist!`);
			}
		}
	}
}
