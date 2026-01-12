/**
 * Debug utilities for dumping graphs to console.
 */

import type { Graph } from "../graph/types";
import type { CompiledGraph } from "../runtime/types";

/**
 * Dump a reified graph in a readable format.
 */
export function dumpGraph(graph: Graph, label = "Graph"): void {
	console.log(`\n=== ${label} ===`);
	console.log(`Output node: ${graph.outputNodeId}`);
	console.log(`Nodes (${graph.nodes.length}):`);

	for (const node of graph.nodes) {
		console.log(`\n  [${node.id}] ${node.spec.processSource.slice(0, 50)}...`);
		console.log(`    Inputs:`);
		for (const [name, binding] of Object.entries(node.inputBindings)) {
			if (binding.type === "constant") {
				console.log(`      ${name}: constant(${JSON.stringify(binding.value)})`);
			} else if (binding.type === "connection") {
				console.log(`      ${name}: ${binding.nodeId}.${binding.output}`);
			} else if (binding.type === "lambda") {
				console.log(`      ${name}: lambda`);
			} else if (binding.type === "connections") {
				const srcs = binding.sources.map(s =>
					s.type === "constant" ? `const(${s.value})` :
					s.type === "lambda" ? "lambda" :
					`${s.nodeId}.${s.output}`
				).join(", ");
				console.log(`      ${name}: [${srcs}]`);
			}
		}
		console.log(`    Outputs: ${node.spec.outputs.join(", ")}`);
	}
}

/**
 * Dump a compiled graph in a readable format.
 */
export function dumpCompiledGraph(graph: CompiledGraph, label = "CompiledGraph"): void {
	console.log(`\n=== ${label} ===`);
	console.log(`Output node: ${graph.outputNodeId}`);
	console.log(`Nodes (${graph.nodes.length}):`);

	for (const node of graph.nodes) {
		const procPreview = node.spec.processSource.slice(0, 60).replace(/\n/g, " ");
		console.log(`\n  [${node.id}] ${procPreview}...`);
		console.log(`    Inputs:`);
		for (const [name, input] of Object.entries(node.inputs)) {
			if (input.type === "constant") {
				console.log(`      ${name}: constant(${JSON.stringify(input.value)})`);
			} else if (input.type === "connection") {
				console.log(`      ${name}: ${input.nodeId}.${input.output}`);
			} else if (input.type === "lambda") {
				console.log(`      ${name}: lambda`);
			} else if (input.type === "connections") {
				const srcs = (input.sources ?? []).map(s =>
					s.type === "constant" ? `const(${s.value})` :
					s.type === "lambda" ? "lambda" :
					`${s.nodeId}.${s.output}`
				).join(", ");
				console.log(`      ${name}: [${srcs}]`);
			}
		}
		console.log(`    Outputs: ${node.spec.outputs.join(", ")}`);
		if (node.wasmBytes) {
			console.log(`    WASM: ${node.wasmBytes.byteLength} bytes`);
		}
	}
}

/**
 * Dump stereo graphs side by side.
 */
export function dumpStereoGraph(
	stereo: { left: Graph; right: Graph },
	label = "StereoGraph"
): void {
	console.log(`\n========== ${label} ==========`);
	dumpGraph(stereo.left, "Left Channel");
	dumpGraph(stereo.right, "Right Channel");
}
