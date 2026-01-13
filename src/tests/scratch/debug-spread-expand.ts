/**
 * Debug spread expand
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { getDeviceSpec } from "@/core2/device/registry";

// Check if spread has expand
const spreadSpec = getDeviceSpec("spread");
console.log("Spread spec exists:", !!spreadSpec);
console.log("Spread has expand:", !!spreadSpec?.expand);
console.log("Spread polyphonic:", spreadSpec?.polyphonic);

// Test spread
console.log("\n=== Spread test ===");
reset();
runCode(`saw([220, 330, 440]).spread().out()`, api);
const graph = collect();
console.log("Nodes:");
for (const n of graph.nodes) {
	console.log(`  ${n.id}: ${n.device}`, JSON.stringify(n.inputs));
}
