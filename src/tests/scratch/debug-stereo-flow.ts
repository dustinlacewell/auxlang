/**
 * Debug the stereo graph flow
 */

import * as api from "../../core2/api";
import { collect } from "../../core2/eval/collect";
import { reset } from "../../core2/eval/reset";
import { runCode } from "../../core2/eval/run-code";
import { expandPoly } from "../../core2/graph/expand-poly";
import { compile } from "../../core2/runtime/compile";

const code = `
saw(440).out()
`;

reset();
runCode(code, api);

const graph = collect();
console.log("FlatGraph:");
console.log("  nodes:", graph.nodes.length);
console.log("  nodes:", graph.nodes.map(n => `${n.id} (${n.device})`));

const stereoGraph = expandPoly(graph);
console.log("\nStereoGraph:");
console.log("  nodes:", stereoGraph.nodes.length);
console.log("  leftOutputIds:", stereoGraph.leftOutputIds);
console.log("  rightOutputIds:", stereoGraph.rightOutputIds);

const { left, right } = compile(stereoGraph);
console.log("\nCompiled:");
console.log("  left.nodes:", left.nodes?.length, Array.isArray(left.nodes));
console.log("  left.outputIds:", left.outputIds);
console.log("  right.nodes:", right.nodes?.length, Array.isArray(right.nodes));
console.log("  right.outputIds:", right.outputIds);
