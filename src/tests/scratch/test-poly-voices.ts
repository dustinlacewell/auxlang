/**
 * Test poly with voice refs
 */

import * as api from "../../core2/api";
import { collect } from "../../core2/eval/collect";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { expandPoly } from "../../core2/graph/expand-poly";
import { compile } from "../../core2/runtime/compile";

reset();

const code = `
let s = clock(60).seq("[c4 ~ {e4, g4} ~ e4]")

s.voices[0].apply(v => v
  .saw()
  .lpf(800)
  .gain(v.gate.ar())
  .gain(0.3)
  .pan()
  .out())

poly([s.voices[1], s.voices[2]]).apply(v => v
  .tri()
  .gain(v.gate.ar())
)
  .spread(-1)
  .out()
`;

try {
	runCode(code, api);
	const graph = collect();
	console.log("=== Flat Graph ===");
	console.log(`Nodes: ${graph.nodes.length}`);
	for (const node of graph.nodes) {
		console.log(`  ${node.id} (${node.device})`);
	}

	const expanded = expandPoly(graph);
	console.log("\n=== Expanded Graph ===");
	console.log(`Nodes: ${expanded.nodes.length}`);
	console.log(`Left: ${expanded.leftOutputIds.join(", ")}`);
	console.log(`Right: ${expanded.rightOutputIds.join(", ")}`);

	const compiled = compile(expanded);
	console.log("\n=== Compiled ===");
	console.log(`Nodes: ${compiled.nodes.length}`);
	console.log("SUCCESS!");
} catch (e) {
	console.error("ERROR:", e);
}
