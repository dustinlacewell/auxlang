/**
 * Debug pan and spread issues
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

// Test 1: Static pan
console.log("=== Test 1: Static pan ===");
reset();
runCode(`sin(440).pan(0.5).out()`, api);
const graph1 = collect();
console.log("Nodes:", graph1.nodes.length);
const expanded1 = expandPoly(graph1);
console.log("Expanded nodes:", expanded1.nodes.length);
console.log("Left outputs:", expanded1.leftOutputIds);
console.log("Right outputs:", expanded1.rightOutputIds);

// Test 2: Modulated pan
console.log("\n=== Test 2: Modulated pan ===");
reset();
try {
	runCode(`sin(440).pan(sin(0.5, -1, 1)).out()`, api);
	const graph2 = collect();
	console.log("Nodes:", graph2.nodes.length);
	const expanded2 = expandPoly(graph2);
	console.log("Expanded nodes:", expanded2.nodes.length);
} catch (err) {
	console.log("ERROR:", err);
}

// Test 3: Spread with 3 voices
console.log("\n=== Test 3: Spread ===");
reset();
try {
	runCode(`
		clock(120).seq("{c4,e4,g4}").apply(s =>
			s.saw().gain(s.gate.ad({ attack: 0.01, decay: 0.2 })).spread().out()
		)
	`, api);
	const graph3 = collect();
	console.log("Nodes:", graph3.nodes.length);
	const expanded3 = expandPoly(graph3);
	console.log("Expanded nodes:", expanded3.nodes.length);
	console.log("Left outputs:", expanded3.leftOutputIds);
	console.log("Right outputs:", expanded3.rightOutputIds);
} catch (err) {
	console.log("ERROR:", err);
}

// Test 4: Simple spread
console.log("\n=== Test 4: Simple spread ===");
reset();
try {
	runCode(`
		saw([220, 330, 440]).spread().out()
	`, api);
	const graph4 = collect();
	console.log("Nodes:", graph4.nodes.length);
	for (const n of graph4.nodes) {
		console.log(`  ${n.id}: ${n.device}`, Object.keys(n.inputs));
	}
	const expanded4 = expandPoly(graph4);
	console.log("Expanded nodes:", expanded4.nodes.length);
} catch (err) {
	console.log("ERROR:", err);
}
