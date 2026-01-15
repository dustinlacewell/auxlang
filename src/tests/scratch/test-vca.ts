import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";

reset();
runCode(`
let s = clock(120).seq("c4 e4 g4")
s.saw().vca(s.gate).out()
`, api);
const graph = collect();
console.log("Nodes:", graph.nodes.map(n => n.device));
