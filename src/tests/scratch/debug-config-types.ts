import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";

// Exact tri showcase code
const code = `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.3, release: 0.5 }) }).out()
)`;

reset();
runCode(code, api);

const graph = collect();
const expanded = expandPoly(graph);
const runtime = compile(expanded);

console.log("All node configs:");
for (const node of runtime.nodes) {
	console.log(`\n${node.device} (${node.id}):`);
	for (const [key, value] of Object.entries(node.config)) {
		console.log(`  ${key}:`, typeof value, value);
		if (typeof value === "object" && value !== null) {
			console.log(`    constructor: ${value.constructor?.name}`);
			console.log(`    keys:`, Object.keys(value));
		}
	}
}
