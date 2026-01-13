/**
 * When cutoff array is larger than voice count, what happens to saw refs?
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

console.log("=== 2 voices (saw), 3 cutoffs ===");
reset();
runCode(`saw([220, 330]).lpf([800, 1200, 1600]).out()`, api);
const g = collect();
const e = expandPoly(g);

console.log("\nSaw nodes:");
for (const n of e.nodes.filter(n => n.device === "saw")) {
  console.log(`  ${n.id}: freq = ${n.inputs.freq}`);
}

console.log("\nLpf nodes (showing input refs):");
for (const n of e.nodes.filter(n => n.device === "lpf")) {
  const input = n.inputs.input as { ref: string };
  console.log(`  ${n.id}: input.ref = ${input.ref}, cutoff = ${n.inputs.cutoff}`);
}

console.log("\nOut nodes:");
for (const n of e.nodes.filter(n => n.device === "out")) {
  const input = n.inputs.input as { ref: string };
  console.log(`  ${n.id}: input.ref = ${input.ref}`);
}
