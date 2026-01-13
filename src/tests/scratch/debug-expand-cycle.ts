import * as api from "../../core2/api";
import { evalToExpanded, evalToGraph } from "../../core2/eval/pipeline";

const code = `clock(120).seq("c3 e3 g3 c4").apply(s =>
  s.cv.saw().gain({ level: s.gate.adsr() }).out()
)`;

try {
	const graph = evalToGraph(code, api);
	console.log("Before expansion:");
	for (const n of graph.nodes) {
		console.log(`  ${n.id}: ${n.device}`);
		for (const [k, v] of Object.entries(n.inputs)) {
			console.log(`    ${k}:`, v);
		}
	}

	console.log("\nExpanding...");
	const expanded = evalToExpanded(code, api);
	console.log("\nAfter expansion:");
	for (const n of expanded.nodes) {
		console.log(`  ${n.id}: ${n.device}`);
	}
} catch (e) {
	console.error("Error:", e);
}
