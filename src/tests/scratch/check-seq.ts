import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";

reset();
runCode('clock(120).seq("c4 e4").apply(s => s.cv.saw().out())', api);
const graph = collect();
console.log("Nodes:");
for (const n of graph.nodes) {
  console.log(" ", n.id, n.device);
}
