import type { Graph, ResolvedInput } from "../graph/types";
import type { CompiledGraph, CompiledInput, CompiledNode, SerializedSpec } from "./types";

/**
 * Compile a graph into a serializable form for the worklet.
 */
export function compile(graph: Graph): CompiledGraph {
	const nodes = graph.nodes.map(compileNode);
	return {
		nodes,
		outputNodeId: graph.outputNodeId,
	};
}

function compileNode(node: Graph["nodes"][number]): CompiledNode {
	const spec = serializeSpec(node.spec);
	const inputs: Record<string, CompiledInput> = {};

	for (const [name, resolved] of Object.entries(node.inputBindings)) {
		inputs[name] = compileInput(resolved);
	}

	// Serialize config functions
	const config: Record<string, string> = {};
	for (const [name, fn] of Object.entries(node.configBindings)) {
		config[name] = fn.toString();
	}

	return {
		id: node.id,
		spec,
		inputs,
		config,
	};
}

function serializeSpec(spec: Graph["nodes"][number]["spec"]): SerializedSpec {
	const inputs: Record<string, { default: number[] }> = {};

	for (const [name, def] of Object.entries(spec.inputs)) {
		// Normalize to array (mono = 1-element array)
		const defaultValue = Array.isArray(def.default) ? def.default : [def.default];
		inputs[name] = { default: defaultValue };
	}

	return {
		inputs,
		outputs: spec.outputs,
		defaultOutput: spec.defaultOutput,
		processSource: spec.processSource,
	};
}

function compileInput(resolved: ResolvedInput): CompiledInput {
	if (resolved.type === "constant") {
		// Normalize to array (mono = 1-element array)
		const value = Array.isArray(resolved.value) ? resolved.value : [resolved.value];
		return { type: "constant", value };
	}

	return {
		type: "connection",
		nodeId: resolved.nodeId,
		output: resolved.output,
	};
}
