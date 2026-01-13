import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

reset();
runCode('saw([220, 330, 440]).spread().out()', api);
const graph = collect();

console.log("=== Before expandPoly ===");
for (const n of graph.nodes) {
  console.log(" ", n.id, n.device, JSON.stringify(n.inputs));
}

const expanded = expandPoly(graph);

console.log("\n=== After expandPoly ===");
for (const n of expanded.nodes) {
  console.log(" ", n.id, n.device, JSON.stringify(n.inputs));
}

console.log("\nLeft outputs:", expanded.leftOutputIds);
console.log("Right outputs:", expanded.rightOutputIds);
