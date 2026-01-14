/**
 * Debug: Check how stack patterns are decomposed into voices
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";
import { createSourceMap, setCurrentSourceMap, findSeqPatterns } from "@/core2/eval/source-map";

const code = `clock(60).seq("{c4,e4,g4}")`;

console.log("Code:", code);

// Create source map
const sourceMap = createSourceMap(code);
setCurrentSourceMap(sourceMap);

reset();
runCode(code, api);
const graph = collect();

console.log("\nPre-expansion seq nodes:");
for (const node of graph.nodes) {
	if (node.device === "seq") {
		console.log(`  ${node.id}: pattern="${node.config.pattern}"`);
	}
}

// expandPoly is where seq.expand gets called
const expanded = expandPoly(graph);

setCurrentSourceMap(null);

console.log("\nSeq patterns found:", findSeqPatterns(code));
console.log("\nSourceMap positions:");
for (const [nodeId, pos] of sourceMap.positions) {
	console.log(`  ${nodeId}: start=${pos.start}, end=${pos.end}`);
}

console.log("\nExpanded seq nodes:");
for (const node of expanded.nodes) {
	if (node.device === "seq") {
		console.log(`  ${node.id}: inSourceMap=${sourceMap.positions.has(node.id)}`);
	}
}
