/**
 * What happens when mix receives poly input?
 * mix doesn't have polyphonic: true, so it should be duplicated?
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

console.log("=== Mix with poly input ===");
reset();
runCode(`
  let voices = saw([220, 330, 440])
  mix({ a: voices, b: sin(880) }).out()
`, api);

const graph = collect();
console.log("\nBefore expansion:");
for (const n of graph.nodes) {
  console.log(`  ${n.id}: ${n.device}`);
  for (const [k, v] of Object.entries(n.inputs)) {
    console.log(`    ${k}: ${JSON.stringify(v)}`);
  }
}

const expanded = expandPoly(graph);
console.log("\nAfter expansion:");
for (const n of expanded.nodes) {
  console.log(`  ${n.id}: ${n.device}`);
}

console.log("\nMix nodes specifically:");
const mixNodes = expanded.nodes.filter(n => n.device === "mix");
for (const n of mixNodes) {
  console.log(`  ${n.id}:`);
  for (const [k, v] of Object.entries(n.inputs)) {
    console.log(`    ${k}: ${JSON.stringify(v)}`);
  }
}
