/**
 * What happens with voice count mismatch?
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

console.log("=== 2 voices, 3 cutoffs ===");
reset();
runCode(`saw([220, 330]).lpf([800, 1200, 1600]).out()`, api);
const g1 = collect();
const e1 = expandPoly(g1);
console.log("Nodes:", e1.nodes.length);
for (const n of e1.nodes.filter(n => n.device === "lpf")) {
  console.log(`  ${n.id}: cutoff = ${n.inputs.cutoff}`);
}

console.log("\n=== 3 voices, 2 cutoffs ===");
reset();
runCode(`saw([220, 330, 440]).lpf([800, 1200]).out()`, api);
const g2 = collect();
const e2 = expandPoly(g2);
console.log("Nodes:", e2.nodes.length);
for (const n of e2.nodes.filter(n => n.device === "lpf")) {
  console.log(`  ${n.id}: cutoff = ${n.inputs.cutoff}`);
}

console.log("\n=== 4 voices, 2 cutoffs (should wrap) ===");
reset();
runCode(`saw([220, 330, 440, 550]).lpf([800, 1200]).out()`, api);
const g3 = collect();
const e3 = expandPoly(g3);
console.log("Nodes:", e3.nodes.length);
for (const n of e3.nodes.filter(n => n.device === "lpf")) {
  console.log(`  ${n.id}: cutoff = ${n.inputs.cutoff}`);
}
