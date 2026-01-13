/**
 * Debug pan and spread - detailed output
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";

// Test modulated pan
console.log("=== Modulated pan ===");
reset();
runCode(`sin(440).pan(sin(0.5, -1, 1)).out()`, api);
const graph1 = collect();
console.log("Pre-expansion nodes:");
for (const n of graph1.nodes) {
	console.log(`  ${n.id}: ${n.device}`, JSON.stringify(n.inputs));
}

const expanded1 = expandPoly(graph1);
console.log("\nPost-expansion nodes:");
for (const n of expanded1.nodes) {
	console.log(`  ${n.id}: ${n.device}`, JSON.stringify(n.inputs));
}
console.log("\nLeft outputs:", expanded1.leftOutputIds);
console.log("Right outputs:", expanded1.rightOutputIds);

// Check what pan produces
console.log("\n=== Pan node inputs ===");
const panNode = graph1.nodes.find(n => n.device === "pan");
if (panNode) {
	console.log("Pan node:", panNode.id);
	console.log("Pan inputs:", JSON.stringify(panNode.inputs, null, 2));
}

// Check how spread handles modulated width
console.log("\n\n=== Spread with modulated width ===");
reset();
runCode(`
	clock(60).seq("{c4,e4,g4}").apply(s =>
		s.saw()
			.lpf(1500)
			.gain(s.gate.ad({ attack: 0.01, decay: 0.3 }))
			.spread({ width: sin(0.2, 0.1, 1) })
			.out()
	)
`, api);
const graph2 = collect();
console.log("Pre-expansion nodes:");
for (const n of graph2.nodes) {
	if (n.device === "spread" || n.device === "mult" || n.device === "sub" || n.device === "add") {
		console.log(`  ${n.id}: ${n.device}`, JSON.stringify(n.inputs));
	}
}

const expanded2 = expandPoly(graph2);
console.log("\nPost-expansion spread-related nodes:");
for (const n of expanded2.nodes) {
	if (n.device === "mult" || n.device === "sub" || n.device === "add") {
		console.log(`  ${n.id}: ${n.device}`, JSON.stringify(n.inputs));
	}
}

// Compile and check
const compiled = compile(expanded2);
console.log("\nCompiled nodes:", compiled.nodes.length);
console.log("Left outputs:", compiled.leftOutputIds);
console.log("Right outputs:", compiled.rightOutputIds);
