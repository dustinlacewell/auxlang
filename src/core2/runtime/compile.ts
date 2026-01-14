/**
 * Compile - converts StereoGraph to stereo RuntimeGraphs.
 *
 * This is the final step before sending to AudioWorklet.
 * Nodes are topologically sorted and inputs are resolved to sources.
 */

import { getDeviceSpec } from "../device/registry";
import type { StereoGraph } from "../graph/expand-poly";
import type { Node, NodeId } from "../graph/node";
import type { OutputRef } from "../graph/output-ref";
import type { SignalLambda } from "../signal/signal-lambda";
import type { ResolvedSource } from "./resolved-source";
import type { RuntimeNode } from "./runtime-node";

/**
 * Stereo runtime graph - single set of nodes, separate L/R output routing.
 * Nodes are processed once per sample, then outputs are routed to channels.
 */
export interface StereoRuntimeGraph {
	readonly nodes: readonly RuntimeNode[];
	readonly leftOutputIds: readonly NodeId[];
	readonly rightOutputIds: readonly NodeId[];
}

/**
 * Compiles a StereoGraph into a StereoRuntimeGraph.
 * Single set of nodes, separate L/R output IDs for routing.
 */
export function compile(graph: StereoGraph): StereoRuntimeGraph {
	// Topological sort all nodes
	const sorted = topologicalSort(graph.nodes);

	// Build runtime nodes
	const nodes: RuntimeNode[] = sorted.map((node) => {
		const spec = getDeviceSpec(node.device);
		const isProcessAll = spec?.processAll !== undefined;
		const inputSources: Record<string, ResolvedSource> = {};

		for (const [name, binding] of Object.entries(node.inputs)) {
			inputSources[name] = resolveSource(binding, isProcessAll);
		}

		return {
			id: node.id,
			device: node.device,
			inputSources,
			config: node.config,
		};
	});

	return {
		nodes,
		leftOutputIds: [...graph.leftOutputIds],
		rightOutputIds: [...graph.rightOutputIds],
	};
}

function resolveSource(binding: unknown, allowArrays = false): ResolvedSource {
	if (binding === undefined || binding === null) {
		return { type: "constant", value: 0 };
	}

	if (typeof binding === "number") {
		return { type: "constant", value: binding };
	}

	if (isOutputRef(binding)) {
		return { type: "connection", nodeId: binding.ref, output: binding.out };
	}

	if (isNodeLike(binding)) {
		const spec = getDeviceSpec(binding.device);
		const output = spec?.defaultOutput ?? "out";
		return { type: "connection", nodeId: binding.id, output };
	}

	if (typeof binding === "function") {
		const fn = binding as SignalLambda;
		if (fn.toString() === "[object Function]") {
			console.error("compile: lambda binding stringified to [object Function]", fn);
		}
		return { type: "lambda", fn };
	}

	if (Array.isArray(binding)) {
		if (!allowArrays) {
			throw new Error("Unexpected array in binding after expansion - run expandPoly first");
		}
		// For processAll devices, convert OutputRef[] to connectionArray
		if (binding.length > 0 && isOutputRef(binding[0])) {
			return {
				type: "connectionArray",
				connections: binding.map((ref: OutputRef) => ({ nodeId: ref.ref, output: ref.out })),
			};
		}
		throw new Error("Array binding must contain OutputRefs");
	}

	throw new Error(`Unknown binding type: ${typeof binding}`);
}

function topologicalSort(nodes: readonly Node[]): Node[] {
	const nodeList = [...nodes];
	const nodeMap = new Map(nodeList.map((n) => [n.id, n]));

	// Build adjacency list (dependencies)
	const deps = new Map<NodeId, Set<NodeId>>();
	for (const node of nodeList) {
		deps.set(node.id, new Set());
		for (const value of Object.values(node.inputs)) {
			if (isOutputRef(value)) {
				deps.get(node.id)!.add(value.ref);
			} else if (isOutputRefArray(value)) {
				for (const ref of value) {
					deps.get(node.id)!.add(ref.ref);
				}
			}
		}
	}

	// Kahn's algorithm
	const result: Node[] = [];
	const inDegree = new Map<NodeId, number>();

	for (const node of nodeList) {
		inDegree.set(node.id, deps.get(node.id)!.size);
	}

	const queue: NodeId[] = [];
	for (const [id, degree] of inDegree) {
		if (degree === 0) {
			queue.push(id);
		}
	}

	while (queue.length > 0) {
		const id = queue.shift()!;
		const node = nodeMap.get(id)!;
		result.push(node);

		// Decrease in-degree of dependents
		for (const other of nodeList) {
			if (deps.get(other.id)?.has(id)) {
				const newDegree = inDegree.get(other.id)! - 1;
				inDegree.set(other.id, newDegree);
				if (newDegree === 0) {
					queue.push(other.id);
				}
			}
		}
	}

	if (result.length !== nodeList.length) {
		throw new Error("Cycle detected in graph");
	}

	return result;
}

function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}

function isOutputRefArray(value: unknown): value is OutputRef[] {
	return Array.isArray(value) && value.length > 0 && isOutputRef(value[0]);
}

function isNodeLike(value: unknown): value is { id: string; device: string } {
	if (value === null || value === undefined) return false;
	const t = typeof value;
	if (t !== "object" && t !== "function") return false;
	const v = value as Record<string, unknown>;
	return typeof v.id === "string" && typeof v.device === "string";
}
