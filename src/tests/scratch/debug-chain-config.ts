import { clock, seq } from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { toWorkletGraph } from "@/core2/runtime/to-worklet-graph";
import { getDeviceSpec } from "@/core2/device/registry";

// Simulate the tri showcase test
reset();

// This is the actual failing code
const code = `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.3, release: 0.5 }) }).out()
)`;

// But let's simplify to isolate
clock(60)
	.seq("{c4,e4,g4}")
	.apply((s) => {
		console.log("Creating tri from chained seq...");
		const triDesc = s.cv.tri();
		console.log("triDesc created");
		return triDesc.out();
	});

const graph = collect();
console.log("\n--- Graph nodes ---");
for (const node of graph.nodes) {
	if (node.device === "tri") {
		console.log("tri node config:", node.config);
		console.log("shape in config?", "shape" in node.config);
		console.log("shape type:", typeof node.config.shape);
	}
}

const expanded = expandPoly(graph);
console.log("\n--- Expanded nodes ---");
for (const node of expanded.nodes) {
	if (node.device === "tri") {
		console.log("tri node config:", node.config);
		console.log("shape in config?", "shape" in node.config);
		console.log("shape type:", typeof node.config.shape);
	}
}

const runtime = compile(expanded);
console.log("\n--- Runtime nodes ---");
for (const node of runtime.nodes) {
	if (node.device === "tri") {
		console.log("tri node config:", node.config);
		console.log("shape in config?", "shape" in node.config);
		console.log("shape type:", typeof node.config.shape);
	}
}

const worklet = await toWorkletGraph(runtime);
console.log("\n--- Worklet nodes ---");
for (const node of worklet.nodes) {
	if (node.device === "tri") {
		console.log("tri node config:", node.config);
		console.log("shape config entry:", node.config.shape);
	}
}

// Also check what the spec says
const triSpec = getDeviceSpec("tri");
console.log("\n--- tri spec ---");
console.log("spec config:", triSpec?.config);
