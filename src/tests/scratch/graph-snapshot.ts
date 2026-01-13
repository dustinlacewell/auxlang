/**
 * Renders graphs before/after expandPoly for comparison.
 * Run before and after the expandPoly rewrite to verify equivalence.
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";

const testCases = [
	// Basic mono
	{ name: "mono-saw", code: `saw(440).out()` },

	// Poly from array input
	{ name: "poly-array", code: `saw([220, 330, 440]).out()` },

	// Poly with spread
	{ name: "poly-spread", code: `saw([220, 330, 440]).spread().out()` },

	// Seq (has expand)
	{ name: "seq-mono", code: `clock(120).seq("c4 e4").cv.saw().out()` },

	// Poly clock into seq
	{ name: "poly-clock-seq", code: `clock([120, 140]).seq("c4 e4").cv.saw().out()` },

	// Pan with static value
	{ name: "pan-static", code: `saw(440).pan(0.5).out()` },

	// Pan with modulation
	{ name: "pan-modulated", code: `saw(440).pan(sin(0.5)).out()` },

	// Poly into pan
	{ name: "poly-pan", code: `saw([220, 330]).pan(0.3).out()` },

	// Spread with width modulation
	{ name: "spread-width-mod", code: `saw([220, 330, 440]).spread().width(sin(0.2)).out()` },
];

function renderGraph(name: string, code: string) {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`TEST: ${name}`);
	console.log(`CODE: ${code}`);
	console.log("=".repeat(60));

	reset();
	runCode(code, api);
	const graph = collect();

	console.log("\n--- API Graph (before expandPoly) ---");
	for (const n of graph.nodes) {
		console.log(`  ${n.id}: ${n.device}`);
		console.log(`    inputs: ${JSON.stringify(n.inputs)}`);
		if (Object.keys(n.config).length > 0) {
			console.log(`    config: ${JSON.stringify(n.config)}`);
		}
	}

	const expanded = expandPoly(graph);

	console.log("\n--- Expanded Graph (after expandPoly) ---");
	for (const n of expanded.nodes) {
		console.log(`  ${n.id}: ${n.device}`);
		console.log(`    inputs: ${JSON.stringify(n.inputs)}`);
		if (Object.keys(n.config).length > 0) {
			console.log(`    config: ${JSON.stringify(n.config)}`);
		}
	}

	console.log("\n--- Outputs ---");
	console.log(`  Left:  [${expanded.leftOutputIds.join(", ")}]`);
	console.log(`  Right: [${expanded.rightOutputIds.join(", ")}]`);
}

// Run all tests
for (const tc of testCases) {
	try {
		renderGraph(tc.name, tc.code);
	} catch (e) {
		console.log(`\n${"=".repeat(60)}`);
		console.log(`TEST: ${tc.name} - FAILED`);
		console.log(`CODE: ${tc.code}`);
		console.log(`ERROR: ${e}`);
	}
}
