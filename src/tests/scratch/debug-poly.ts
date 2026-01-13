import * as api from "../../core2/api";
import { evalToExpanded, evalToGraph } from "../../core2/eval/pipeline";

const code = `poly([sin(220), sin(330), sin(440)]).gain(0.2).out()`;

try {
	const graph = evalToGraph(code, api);
	console.log("Before expansion:");
	for (const n of graph.nodes) {
		console.log(`  ${n.id}: ${n.device}`);
		for (const [k, v] of Object.entries(n.inputs)) {
			console.log(`    ${k}:`, JSON.stringify(v));
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
