import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly } from "@/core2/graph/expand-poly";

// The exact tri showcase code that's failing
const code = `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.3, release: 0.5 }) }).out()
)`;

reset();
runCode(code, api);

const graph = collect();
console.log("=== All nodes before expansion ===");
for (const node of graph.nodes) {
	console.log(`${node.device} (${node.id})`);
}

const expanded = expandPoly(graph);
console.log("\n=== All nodes after expansion ===");
for (const node of expanded.nodes) {
	console.log(`${node.device} (${node.id})`);
}
