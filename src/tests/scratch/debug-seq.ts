import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { toWorkletGraph } from "@/core2/runtime/to-worklet-graph";
import * as api from "@/core2/api";

reset();

// Test seq directly first
const s = api.seq("c3 e3 g3 c4");
console.log("Direct seq call:");
console.log("  s:", s);
console.log("  s.id:", (s as any).id);
console.log("  s.config:", (s as any).config);

reset();

// Test chaining
const c = api.clock(120);
const s2 = (c as any).seq("c3 e3 g3 c4");
console.log("\nChained seq call:");
console.log("  s2.id:", (s2 as any).id);
console.log("  s2.config:", (s2 as any).config);

reset();

const code = `
clock(120).seq("c3 e3 g3 c4").apply(s =>
  s.cv.saw().gain({ level: s.gate.adsr() }).out()
)
`;

runCode(code, api);

const graph = collect();
console.log("Graph nodes:", graph.nodes.length);
console.log("Graph output:", graph.output);

if (graph.nodes.length > 0) {
	console.log("\nNodes:");
	for (const node of graph.nodes) {
		console.log(`  ${node.id}: ${node.device}`);
		console.log("    inputs:", Object.keys(node.inputs));
		console.log("    config:", node.config);
	}
}

if (graph.output) {
	const expanded = expandPoly(graph);
	console.log("\n=== Expanded ===");
	for (const node of expanded.nodes) {
		console.log(`  ${node.id}: ${node.device}`);
		console.log("    config:", node.config);
	}

	const runtime = compile(expanded);
	console.log("\n=== Runtime ===");
	for (const node of runtime.nodes) {
		console.log(`  ${node.id}: ${node.device}`);
		console.log("    config:", node.config);
	}

	const worklet = toWorkletGraph(runtime);
	console.log("\n=== Worklet ===");
	for (const node of worklet.nodes) {
		console.log(`  ${node.id}: ${node.device}`);
		console.log("    config:", JSON.stringify(node.config, null, 2));
	}
}
