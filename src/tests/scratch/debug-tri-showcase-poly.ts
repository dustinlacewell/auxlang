import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { toWorkletGraph } from "@/core2/runtime/to-worklet-graph";

// The exact tri showcase code that's failing
const code = `clock(60).seq("{c4,e4,g4}").apply(s =>
  s.cv.tri().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr({ attack: 0.3, release: 0.5 }) }).out()
)`;

reset();
runCode(code, api);

const graph = collect();
console.log("=== Before expansion ===");
for (const node of graph.nodes) {
	if (node.device === "tri") {
		console.log(`tri (${node.id}):`, { config: node.config, shapeType: typeof node.config.shape });
	}
}

const expanded = expandPoly(graph);
console.log("\n=== After expansion ===");
for (const node of expanded.nodes) {
	if (node.device === "tri") {
		console.log(`tri (${node.id}):`, { config: node.config, shapeType: typeof node.config.shape });
	}
}

const runtime = compile(expanded);
console.log("\n=== Runtime ===");
for (const node of runtime.nodes) {
	if (node.device === "tri") {
		console.log(`tri (${node.id}):`, { config: node.config, shapeType: typeof node.config.shape });
	}
}

// Mock fetch for Node.js
globalThis.fetch = async (url: string) => {
	console.log(`[MOCK] fetch ${url}`);
	return { ok: false } as Response;
};

try {
	const worklet = await toWorkletGraph(runtime);
	console.log("\n=== Worklet ===");
	for (const node of worklet.nodes) {
		if (node.device === "tri") {
			console.log(`tri (${node.id}):`, { config: node.config });
		}
	}

	// Check for any functions remaining
	function findFunctions(obj: unknown, path: string[] = []): void {
		if (typeof obj === "function") {
			console.error(`FUNCTION at ${path.join(".")}: ${String(obj).slice(0, 80)}`);
		} else if (Array.isArray(obj)) {
			obj.forEach((item, i) => findFunctions(item, [...path, `[${i}]`]));
		} else if (typeof obj === "object" && obj !== null) {
			for (const [k, v] of Object.entries(obj)) {
				findFunctions(v, [...path, k]);
			}
		}
	}

	console.log("\n=== Checking for unserialized functions ===");
	findFunctions(worklet, ["worklet"]);
	console.log("Done checking.");
} catch (e) {
	console.error("Error during toWorkletGraph:", e);
}
