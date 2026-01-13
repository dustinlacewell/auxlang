/**
 * Dump the actual graph structure for:
 * clock(60).seq("c4 ~ ~ ~").apply(s =>
 *   s.sin().gain(s.gate.adsr()).delay({ feedback: 0.1, time: 0.23 }).out()
 * )
 */

import * as api from "../../core2/api";
import { collect } from "../../core2/eval/collect";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { expandPoly } from "../../core2/graph/expand-poly";
import { compile } from "../../core2/runtime/compile";

reset();

const code = `
clock(60).seq("c4 ~ ~ ~").apply(s =>
  s.sin().gain(s.gate.adsr()).delay({ feedback: 0.1, time: 0.23 }).out()
)
`;

runCode(code, api);
const graph = collect();
const expanded = expandPoly(graph);
const compiled = compile(expanded);

console.log("=== Compiled Graph ===\n");
console.log(`Output IDs: ${compiled.outputIds.join(", ")}\n`);

console.log("Nodes (in execution order):");
for (const node of compiled.nodes) {
	console.log(`\n  ${node.id} (${node.device})`);
	console.log("    Inputs:");
	for (const [name, source] of Object.entries(node.inputSources)) {
		if (source.type === "constant") {
			console.log(`      ${name}: constant(${source.value})`);
		} else if (source.type === "connection") {
			console.log(`      ${name}: ${source.nodeId}.${source.output}`);
		} else {
			console.log(`      ${name}: lambda`);
		}
	}
}

// Check for any node that references delay's output
console.log("\n\n=== Checking for feedback loops ===");
const delayNode = compiled.nodes.find(n => n.device === "delay");
if (delayNode) {
	console.log(`Delay node ID: ${delayNode.id}`);

	for (const node of compiled.nodes) {
		for (const [name, source] of Object.entries(node.inputSources)) {
			if (source.type === "connection" && source.nodeId === delayNode.id) {
				console.log(`  ${node.id}.${name} <- ${delayNode.id}.${source.output}`);
			}
		}
	}
}
