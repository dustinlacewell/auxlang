import * as api from "../../core2/api";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { collect } from "../../core2/eval/collect";
import { expandPoly } from "../../core2/graph/expand-poly";

const code = `clock(180).seq("c4*4").apply(s =>
  sah({ input: noise(), trig: s.trig })
    .scale({ from: -1, to: 1, min: 150, max: 600 })
    .quantize({ scale: "blues" })
    .tri()
    .gain({ level: s.gate.ar() })
    .out()
)`;

reset();
runCode(code, api);
const graph = collect();

console.log("=== API Graph ===");
for (const n of graph.nodes) {
  console.log(`  ${n.id}: ${n.device}`);
  console.log(`    inputs:`, JSON.stringify(n.inputs));
  console.log(`    config:`, JSON.stringify(n.config));
}

const expanded = expandPoly(graph);

console.log("\n=== Expanded Graph ===");
for (const n of expanded.nodes) {
  console.log(`  ${n.id}: ${n.device}`);
  console.log(`    inputs:`, JSON.stringify(n.inputs));
  console.log(`    config:`, JSON.stringify(n.config));
}
