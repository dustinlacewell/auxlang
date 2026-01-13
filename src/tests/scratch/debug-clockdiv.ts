import * as api from "../../core2/api";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { collect } from "../../core2/eval/collect";
import { expandPoly } from "../../core2/graph/expand-poly";

reset();

const code = `clock(240).apply(c =>
  mix({
    a: c.seq("c5 e5 g5 c6").apply(s => s.cv.tri().gain({ level: s.gate.ar() })),
    b: clockDiv(c).by(4).seq("c3").apply(s => s.cv.sin().gain({ level: s.gate.ar({ release: 0.3 }) }))
  }).out()
)`;

try {
  runCode(code, api);
  const graph = collect();
  console.log("Nodes:", graph.nodes.length);
  console.log("Node list:");
  for (const n of graph.nodes) {
    console.log(`  ${n.id}: ${n.device}`, JSON.stringify(n.inputs));
  }

  const expanded = expandPoly(graph);
  console.log("\nExpanded:", expanded.nodes.length, "nodes");
} catch (e: any) {
  console.error("Error:", e.message);
  console.error(e.stack);
}
