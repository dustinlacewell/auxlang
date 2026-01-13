import { sqr } from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { toWorkletGraph } from "@/core2/runtime/to-worklet-graph";

reset();
sqr(110).out();

const graph = collect();
const expanded = expandPoly(graph);
const runtime = compile(expanded);
const worklet = await toWorkletGraph(runtime);

console.log("Worklet node config:", worklet.nodes[0]?.config);
console.log("Shape source:", (worklet.nodes[0]?.config.shape as any)?.source);
