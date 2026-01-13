/**
 * Debug spread not responding to modulation
 */

import * as api from "../../core2/api";
import { collect } from "../../core2/eval/collect";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { expandPoly } from "../../core2/graph/expand-poly";
import { compile } from "../../core2/runtime/compile";

reset();

const code = `
let s = clock(60).seq("[c4 ~ {e2, g4} ~ e4]")

poly([s.voices[1], s.voices[2]]).apply(v => v
  .tri()
  .gain(v.gate.ar())
)
  .spread(sin(.1, -1, 1))
  .out()
`;

runCode(code, api);
const graph = collect();

console.log("=== Flat Graph (before expansion) ===\n");
for (const node of graph.nodes) {
	console.log(`${node.id} (${node.device})`);
	console.log("  inputs:", JSON.stringify(node.inputs, null, 2));
}

console.log("\n=== Expanding... ===\n");
const expanded = expandPoly(graph);

console.log("=== Expanded Graph ===\n");
console.log(`Left outputs: ${expanded.leftOutputIds.join(", ")}`);
console.log(`Right outputs: ${expanded.rightOutputIds.join(", ")}`);

for (const node of expanded.nodes) {
	console.log(`\n${node.id} (${node.device})`);
	console.log("  inputs:", JSON.stringify(node.inputs, null, 2));
}

console.log("\n=== Compiling... ===\n");
const compiled = compile(expanded);

console.log("=== Compiled Graph ===\n");
console.log(`Output IDs: ${compiled.outputIds?.join(", ") ?? "none"}\n`);

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
