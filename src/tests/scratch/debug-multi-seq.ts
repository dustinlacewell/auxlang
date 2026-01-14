/**
 * Debug: Multiple seq patterns - check nodeId to position mapping
 */

import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";
import { createSourceMap, setCurrentSourceMap, findSeqPatterns } from "@/core2/eval/source-map";

const code = `
let clk = clock(130)

seq("a1 ~ c2 d2 ~ e2 g2 ~", clk)
  .saw()
  .out()

seq("~ <c4 c4 c4 c4*8>", clk)
  .saw()
  .out()

clk
  .seq("{c4 c3,e4 [e3 f3],g4 g3}")
  .saw()
  .out()
`;

console.log("Code patterns:");
const patterns = findSeqPatterns(code);
for (const p of patterns) {
	console.log(`  "${p.pattern}" at ${p.patternStart}-${p.patternEnd}`);
}

// Create source map
const sourceMap = createSourceMap(code);
setCurrentSourceMap(sourceMap);

reset();
runCode(code, api);
const graph = collect();
const expanded = expandPoly(graph);

setCurrentSourceMap(null);

console.log("\nSourceMap positions:");
for (const [nodeId, pos] of sourceMap.positions) {
	const patternText = code.slice(pos.start, pos.end);
	console.log(`  ${nodeId}: "${patternText}" (${pos.start}-${pos.end})`);
}

console.log("\nExpanded seq nodes:");
for (const node of expanded.nodes) {
	if (node.device === "seq") {
		const pos = sourceMap.positions.get(node.id);
		const patternText = pos ? code.slice(pos.start, pos.end) : "NOT FOUND";
		console.log(`  ${node.id}: maps to "${patternText}"`);
	}
}
