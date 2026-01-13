import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { toWorkletGraph } from "@/core2/runtime/to-worklet-graph";

// This is the exact tri showcase code
const code = `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.3, release: 0.5 }) }).out()
)`;

reset();
runCode(code, api);

const graph = collect();
console.log("\n--- Graph nodes with tri ---");
for (const node of graph.nodes) {
	if (node.device === "tri") {
		console.log("tri node config:", node.config);
		console.log("shape type:", typeof node.config.shape);
	}
}

const expanded = expandPoly(graph);
console.log("\n--- Expanded nodes with tri ---");
for (const node of expanded.nodes) {
	if (node.device === "tri") {
		console.log("tri node config:", node.config);
		console.log("shape type:", typeof node.config.shape);
	}
}

const runtime = compile(expanded);
console.log("\n--- Runtime nodes with tri ---");
for (const node of runtime.nodes) {
	if (node.device === "tri") {
		console.log("tri node config:", node.config);
		console.log("shape type:", typeof node.config.shape);
	}
}

try {
	const worklet = await toWorkletGraph(runtime);
	console.log("\n--- Worklet nodes with tri ---");
	for (const node of worklet.nodes) {
		if (node.device === "tri") {
			console.log("tri node config:", node.config);
		}
	}
	console.log("\n✓ Serialization successful!");
} catch (e) {
	console.error("Serialization failed:", e);
}
