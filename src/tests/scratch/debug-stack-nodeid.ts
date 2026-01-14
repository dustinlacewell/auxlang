/**
 * Debug: Check if nodeId matching works for stack patterns
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { toWorkletStereoGraph } from "@/core2/runtime/to-worklet-graph";
import { createSourceMap, setCurrentSourceMap, findSeqPatterns } from "@/core2/eval/source-map";

const code = `clock(60).seq("{c4,e4,g4}")`;

console.log("Code:", code);

// Create source map
const sourceMap = createSourceMap(code);
setCurrentSourceMap(sourceMap);

reset();
runCode(code, api);
const graph = collect();
const expanded = expandPoly(graph);
const runtime = compile(expanded);
const worklet = toWorkletStereoGraph(runtime);

setCurrentSourceMap(null);

console.log("\nSeq patterns found:", findSeqPatterns(code));
console.log("\nSourceMap positions:");
for (const [nodeId, pos] of sourceMap.positions) {
	console.log(`  ${nodeId}: start=${pos.start}, end=${pos.end}`);
}

console.log("\nWorklet structure:", Object.keys(worklet));
const nodes = worklet.left?.nodes || worklet.nodes || [];
console.log("\nWorklet seq nodes:");
for (const node of nodes) {
	if (node.device === "seq") {
		console.log(`  ${node.id}: pattern="${node.config.pattern}"`);
	}
}

// Check if nodeIds match
const seqPatterns = findSeqPatterns(code);
const workletSeqNodes = nodes.filter((n: any) => n.device === "seq");
console.log("\nNodeId matching:");
for (const pattern of seqPatterns) {
	const matchingNode = workletSeqNodes.find((n: any) => n.id === pattern.nodeId);
	const inSourceMap = sourceMap.positions.has(pattern.nodeId);
	console.log(`  ${pattern.nodeId}: inSourceMap=${inSourceMap}, matchesWorklet=${!!matchingNode}`);
}
