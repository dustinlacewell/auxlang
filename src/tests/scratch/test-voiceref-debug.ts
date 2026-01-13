/**
 * Debug VoiceRef resolution
 */

import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly } from "@/core2/graph/expand-poly";
import { graphToDot, stereoGraphToDot } from "@/core2/viz/graph-to-dot";

const code = `
let s = clock(120).seq("{c3!4,[c4 e4 g4 e4], ~ ~ ~ g4}")
s.saw()
  .lpf(800)
  .gain({ level: s.gate.ar() })
  .gain(0.3)
  //.out()
seq("c4!4")
  .clk(s.voices[0].trig)
  .trig
  .kick(0.2)
  .gain(0.6)
  .out()
`;

reset();
runCode(code, api);
const graph = collect();

console.log("=== Pre-expansion nodes ===");
for (const node of graph.nodes) {
	console.log(`${node.id}: ${node.device}`);
	for (const [key, value] of Object.entries(node.inputs)) {
		console.log(`  ${key}:`, JSON.stringify(value));
	}
}

console.log("\n=== Pre-expansion DOT ===");
console.log(graphToDot(graph));

const expanded = expandPoly(graph);

console.log("\n=== Post-expansion nodes ===");
for (const node of expanded.nodes) {
	console.log(`${node.id}: ${node.device}`);
	for (const [key, value] of Object.entries(node.inputs)) {
		console.log(`  ${key}:`, JSON.stringify(value));
	}
}

console.log("\n=== Post-expansion DOT ===");
console.log(stereoGraphToDot(expanded));

console.log("\n=== Left outputs ===", expanded.leftOutputIds);
console.log("=== Right outputs ===", expanded.rightOutputIds);
