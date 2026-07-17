/**
 * Debug clock -> seq chaining
 */

import { clock, seq, saw, out } from "@/core2/api";
import { getBuilder } from "@/core2/graph/graph-builder";
import { compile } from "@/core2/runtime/compile";

// Set up graph builder
const builder = getBuilder();

// Create a simple chain
const result = clock(120).seq("c4 e4 g4").saw().out();

console.log("=== Graph nodes ===");
for (const [id, node] of builder.nodes) {
	console.log(`${id}: ${node.type}`, {
		inputs: node.inputs,
		config: node.config,
	});
}

console.log("\n=== Compiling ===");
const compiled = compile(builder);
console.log("Compiled graph nodes:", compiled.graph.nodes.length);

// Check the seq node's input
const seqNode = Array.from(builder.nodes.values()).find(n => n.type === "seq");
console.log("\n=== Seq node details ===");
console.log("Seq inputs:", seqNode?.inputs);
console.log("Seq config:", seqNode?.config);
