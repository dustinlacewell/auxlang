import type { Graph, ResolvedInput } from "../graph/types";
import type { CompiledGraph, CompiledInput, CompiledNode, SerializedSpec } from "./types";

/** Cache of fetched WASM modules by URL */
const wasmCache = new Map<string, ArrayBuffer>();

/**
 * Compile a graph into a serializable form for the worklet.
 * Fetches any WASM modules referenced by devices.
 */
export async function compile(graph: Graph): Promise<CompiledGraph> {
	// Collect unique WASM URLs and fetch them in parallel
	const wasmUrls = new Set<string>();
	for (const node of graph.nodes) {
		if (node.spec.wasmUrl) {
			wasmUrls.add(node.spec.wasmUrl);
		}
	}

	// Fetch any URLs not already cached
	const fetchPromises: Promise<void>[] = [];
	for (const url of wasmUrls) {
		if (!wasmCache.has(url)) {
			fetchPromises.push(
				fetch(url)
					.then((res) => {
						if (!res.ok) throw new Error(`Failed to fetch WASM: ${url}`);
						return res.arrayBuffer();
					})
					.then((bytes) => {
						wasmCache.set(url, bytes);
					}),
			);
		}
	}
	await Promise.all(fetchPromises);

	// Now compile nodes with WASM bytes available
	const nodes = graph.nodes.map((node) => compileNode(node, wasmCache));
	return {
		nodes,
		outputNodeId: graph.outputNodeId,
	};
}

function compileNode(
	node: Graph["nodes"][number],
	wasmCache: Map<string, ArrayBuffer>,
): CompiledNode {
	const spec = serializeSpec(node.spec);
	const inputs: Record<string, CompiledInput> = {};

	for (const [name, resolved] of Object.entries(node.inputBindings)) {
		inputs[name] = compileInput(resolved);
	}

	// Serialize config values (functions as source, data as JSON)
	const config: Record<string, { type: "fn"; source: string } | { type: "data"; value: unknown }> = {};
	for (const [name, value] of Object.entries(node.configBindings)) {
		if (typeof value === "function") {
			config[name] = { type: "fn", source: value.toString() };
		} else {
			config[name] = { type: "data", value };
		}
	}

	const compiled: CompiledNode = {
		id: node.id,
		spec,
		inputs,
		config,
	};

	// Include wasmBytes if this device has a wasmUrl
	if (node.spec.wasmUrl) {
		const wasmBytes = wasmCache.get(node.spec.wasmUrl);
		if (wasmBytes) {
			return { ...compiled, wasmBytes };
		}
	}

	return compiled;
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
		defaultInput: spec.defaultInput,
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

	if (resolved.type === "lambda") {
		return { type: "lambda", fnSource: resolved.fn.toString() };
	}

	return {
		type: "connection",
		nodeId: resolved.nodeId,
		output: resolved.output,
	};
}
