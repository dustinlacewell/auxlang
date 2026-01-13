/**
 * Poly expansion pass - processes nodes topologically, expanding and duplicating as needed.
 *
 * This pass runs after API execution, before compilation.
 * Nodes are processed in topological order (dependencies first).
 *
 * For each node:
 *   1. Resolve VoiceRefs to OutputRefs
 *   2. If polyphonic: don't duplicate, call expand with poly inputs (or keep for processAll)
 *   3. Else if upstream is poly: duplicate N times, call expand on each if it has one
 *   4. Else: keep as-is, call expand if it has one
 *
 * nodeMap is updated after each node so downstream sees expanded refs.
 */

import { getDeviceSpec } from "../device/registry";
import { resetNodeCounter } from "./create-node";
import type { FlatGraph } from "./flat-graph";
import type { Node, NodeId } from "./node";
import type { OutputRef } from "./output-ref";
import { isVoiceRef, isVoiceRefArray, type NodeInput, type VoiceRef } from "../signal/node-input";
import type { WrappedNode } from "../wrap/wrap";

/** Extract plain Node from WrappedNode */
function extractNode(wrapped: WrappedNode): Node {
	return {
		id: wrapped.id,
		device: wrapped.device,
		inputs: wrapped.inputs,
		config: wrapped.config,
	};
}

/** Expanded graph with stereo-distributed outputs */
export interface StereoGraph {
	readonly nodes: readonly Node[];
	readonly leftOutputIds: readonly NodeId[];
	readonly rightOutputIds: readonly NodeId[];
}

/**
 * Expands a flat graph by processing nodes topologically.
 * Handles VoiceRef resolution, poly duplication, and device expansion.
 */
export function expandPoly(graph: FlatGraph): StereoGraph {
	// Reset node counter for deterministic IDs during expansion
	resetNodeCounter();

	// Sort nodes topologically (dependencies first)
	const sorted = topologicalSort(graph.nodes);

	// Track how each original node maps to expanded node(s)
	// oldId -> [newId0, newId1, ...] or [newId] for mono
	const nodeMap = new Map<NodeId, NodeId[]>();

	// Collect all new nodes
	const newNodes: Node[] = [];

	// Process each node in topological order
	for (const node of sorted) {
		const spec = getDeviceSpec(node.device);

		// First: resolve VoiceRefs to OutputRefs (upstream already processed)
		const inputsWithResolvedVoiceRefs = resolveVoiceRefs(node.inputs, nodeMap, spec?.defaultOutput ?? "out");

		// Then: resolve OutputRefs using nodeMap
		const resolvedInputs = resolveOutputRefs(inputsWithResolvedVoiceRefs, nodeMap);

		// Determine if this node needs duplication based on upstream poly
		const upstreamVoiceCount = getUpstreamVoiceCount(inputsWithResolvedVoiceRefs, nodeMap);

		if (spec?.polyphonic) {
			// Polyphonic device: don't duplicate
			if (spec.expand) {
				// Call expand with poly inputs
				const result = spec.expand(node.config, resolvedInputs);
				const outputNodes = Array.isArray(result) ? result : [result];
				const expandedNodes = outputNodes.map(extractNode);
				newNodes.push(...expandedNodes);
				nodeMap.set(node.id, expandedNodes.map((n) => n.id));
			} else {
				// No expand - keep node for processAll at runtime
				const newNode: Node = { ...node, inputs: resolvedInputs };
				newNodes.push(newNode);
				nodeMap.set(node.id, [node.id]);
			}
		} else if (upstreamVoiceCount > 1) {
			// Upstream is poly - duplicate this node for each voice
			const cloneIds: NodeId[] = [];

			for (let v = 0; v < upstreamVoiceCount; v++) {
				const voiceInputs = pickVoiceInputs(inputsWithResolvedVoiceRefs, v, nodeMap);

				if (spec?.expand) {
					// Call expand for each duplicate
					const result = spec.expand(node.config, voiceInputs);
					const outputNodes = Array.isArray(result) ? result : [result];
					const expandedNodes = outputNodes.map(extractNode);
					newNodes.push(...expandedNodes);

					// Use the last output as the "output" for this voice
					const lastNode = expandedNodes[expandedNodes.length - 1]!;
					cloneIds.push(lastNode.id);
				} else {
					// No expand - just create duplicated node
					const newId = `${node.id}.${v}`;
					const newNode: Node = { ...node, id: newId, inputs: voiceInputs };
					newNodes.push(newNode);
					cloneIds.push(newId);
				}
			}

			nodeMap.set(node.id, cloneIds);
		} else {
			// Mono - no duplication needed
			if (spec?.expand) {
				const result = spec.expand(node.config, resolvedInputs);
				const outputNodes = Array.isArray(result) ? result : [result];
				const expandedNodes = outputNodes.map(extractNode);
				newNodes.push(...expandedNodes);
				nodeMap.set(node.id, expandedNodes.map((n) => n.id));
			} else {
				// No expand - just update refs and keep node
				const newNode: Node = { ...node, inputs: resolvedInputs };
				newNodes.push(newNode);
				nodeMap.set(node.id, [node.id]);
			}
		}
	}

	// Find out nodes and distribute L/R
	// Each out node independently distributes its voices to stereo
	const outNodes = graph.nodes.filter((n) => n.device === "out");
	const leftOutputIds: NodeId[] = [];
	const rightOutputIds: NodeId[] = [];

	for (const outNode of outNodes) {
		const expandedIds = nodeMap.get(outNode.id) || [outNode.id];

		if (expandedIds.length === 1) {
			// Mono: send to both L and R
			leftOutputIds.push(expandedIds[0]!);
			rightOutputIds.push(expandedIds[0]!);
		} else {
			// Poly: distribute round-robin (even → L, odd → R)
			for (let i = 0; i < expandedIds.length; i++) {
				if (i % 2 === 0) {
					leftOutputIds.push(expandedIds[i]!);
				} else {
					rightOutputIds.push(expandedIds[i]!);
				}
			}
		}
	}

	return {
		nodes: newNodes,
		leftOutputIds,
		rightOutputIds,
	};
}

/**
 * Topological sort - dependencies before dependents.
 * Handles OutputRef, OutputRef[], VoiceRef, and VoiceRef[] as dependencies.
 */
function topologicalSort(nodes: readonly Node[]): Node[] {
	const nodeById = new Map(nodes.map((n) => [n.id, n]));

	// Build adjacency list (what each node depends on)
	const deps = new Map<NodeId, Set<NodeId>>();
	for (const node of nodes) {
		deps.set(node.id, new Set());
		for (const value of Object.values(node.inputs)) {
			if (isOutputRef(value)) {
				deps.get(node.id)!.add(value.ref);
			} else if (isOutputRefArray(value)) {
				for (const ref of value) {
					deps.get(node.id)!.add(ref.ref);
				}
			} else if (isVoiceRef(value)) {
				deps.get(node.id)!.add(value.source);
			} else if (isVoiceRefArray(value)) {
				for (const ref of value) {
					deps.get(node.id)!.add(ref.source);
				}
			}
		}
	}

	// Kahn's algorithm
	const inDegree = new Map<NodeId, number>();
	for (const node of nodes) {
		inDegree.set(node.id, deps.get(node.id)!.size);
	}

	const queue: NodeId[] = [];
	for (const [id, degree] of inDegree) {
		if (degree === 0) {
			queue.push(id);
		}
	}

	const result: Node[] = [];
	while (queue.length > 0) {
		const id = queue.shift()!;
		const node = nodeById.get(id)!;
		result.push(node);

		// Decrease in-degree of nodes that depend on this one
		for (const other of nodes) {
			if (deps.get(other.id)?.has(id)) {
				const newDegree = inDegree.get(other.id)! - 1;
				inDegree.set(other.id, newDegree);
				if (newDegree === 0) {
					queue.push(other.id);
				}
			}
		}
	}

	if (result.length !== nodes.length) {
		throw new Error("Cycle detected in graph");
	}

	return result;
}

/**
 * Resolve VoiceRefs to OutputRefs.
 * VoiceRef { source, index, output? } → OutputRef { ref: expandedId, out }
 */
function resolveVoiceRefs(
	inputs: Record<string, unknown>,
	nodeMap: Map<NodeId, NodeId[]>,
	defaultOutput: string,
): Record<string, NodeInput> {
	const result: Record<string, NodeInput> = {};

	for (const [key, value] of Object.entries(inputs)) {
		if (isVoiceRef(value)) {
			result[key] = resolveOneVoiceRef(value, nodeMap, defaultOutput);
		} else if (isVoiceRefArray(value)) {
			result[key] = value.map((vr) => resolveOneVoiceRef(vr, nodeMap, defaultOutput));
		} else {
			result[key] = value as NodeInput;
		}
	}

	return result;
}

function resolveOneVoiceRef(vr: VoiceRef, nodeMap: Map<NodeId, NodeId[]>, defaultOutput: string): OutputRef {
	const upstreamIds = nodeMap.get(vr.source);
	if (!upstreamIds) {
		throw new Error(`VoiceRef source "${vr.source}" not found in nodeMap`);
	}
	if (vr.index >= upstreamIds.length) {
		throw new Error(`VoiceRef index ${vr.index} out of range for "${vr.source}" (has ${upstreamIds.length} voices)`);
	}
	return {
		ref: upstreamIds[vr.index]!,
		out: vr.output ?? defaultOutput,
	};
}

/**
 * Resolve OutputRefs by updating refs to point to expanded nodes.
 * If upstream was expanded to poly, creates array of refs.
 */
function resolveOutputRefs(
	inputs: Record<string, NodeInput>,
	nodeMap: Map<NodeId, NodeId[]>,
): Record<string, NodeInput> {
	const result: Record<string, NodeInput> = {};

	for (const [key, value] of Object.entries(inputs)) {
		if (isOutputRef(value)) {
			const upstreamIds = nodeMap.get(value.ref);
			if (upstreamIds && upstreamIds.length > 1) {
				// Upstream expanded to poly - create array of refs
				result[key] = upstreamIds.map((id): OutputRef => ({ ref: id, out: value.out }));
			} else if (upstreamIds && upstreamIds.length === 1) {
				// Upstream is mono but may have different ID
				result[key] = { ref: upstreamIds[0]!, out: value.out };
			} else {
				result[key] = value;
			}
		} else if (isOutputRefArray(value)) {
			// Already an array - resolve each ref
			result[key] = value.map((ref) => {
				const upstreamIds = nodeMap.get(ref.ref);
				if (upstreamIds && upstreamIds.length === 1) {
					return { ref: upstreamIds[0]!, out: ref.out };
				}
				return ref;
			});
		} else if (isNumberArray(value)) {
			// Keep number arrays as-is (they're poly sources)
			result[key] = value;
		} else {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Get the voice count from upstream nodes.
 * Called after VoiceRefs are resolved to OutputRefs.
 */
function getUpstreamVoiceCount(
	inputs: Record<string, NodeInput>,
	nodeMap: Map<NodeId, NodeId[]>,
): number {
	let maxCount = 1;

	for (const value of Object.values(inputs)) {
		if (isNumberArray(value)) {
			maxCount = Math.max(maxCount, value.length);
		} else if (isOutputRefArray(value)) {
			maxCount = Math.max(maxCount, value.length);
		} else if (isOutputRef(value)) {
			const upstreamIds = nodeMap.get(value.ref);
			if (upstreamIds) {
				maxCount = Math.max(maxCount, upstreamIds.length);
			}
		}
	}

	return maxCount;
}

/**
 * Pick inputs for a specific voice index.
 * Arrays get indexed, refs get remapped to the voice's upstream node.
 */
function pickVoiceInputs(
	inputs: Record<string, NodeInput>,
	voiceIndex: number,
	nodeMap: Map<NodeId, NodeId[]>,
): Record<string, NodeInput> {
	const result: Record<string, NodeInput> = {};

	for (const [key, value] of Object.entries(inputs)) {
		if (isNumberArray(value)) {
			result[key] = value[voiceIndex % value.length] ?? 0;
		} else if (isOutputRefArray(value)) {
			const ref = value[voiceIndex % value.length]!;
			const upstreamIds = nodeMap.get(ref.ref);
			if (upstreamIds && upstreamIds.length > 1) {
				result[key] = { ref: upstreamIds[voiceIndex % upstreamIds.length]!, out: ref.out };
			} else if (upstreamIds && upstreamIds.length === 1) {
				result[key] = { ref: upstreamIds[0]!, out: ref.out };
			} else {
				result[key] = ref;
			}
		} else if (isOutputRef(value)) {
			const upstreamIds = nodeMap.get(value.ref);
			if (upstreamIds && upstreamIds.length > 1) {
				result[key] = { ref: upstreamIds[voiceIndex % upstreamIds.length]!, out: value.out };
			} else if (upstreamIds && upstreamIds.length === 1) {
				result[key] = { ref: upstreamIds[0]!, out: value.out };
			} else {
				result[key] = value;
			}
		} else {
			result[key] = value;
		}
	}

	return result;
}

function isNumberArray(value: unknown): value is number[] {
	return Array.isArray(value) && value.length > 0 && typeof value[0] === "number";
}

function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value && !("type" in value);
}

function isOutputRefArray(value: unknown): value is OutputRef[] {
	return Array.isArray(value) && value.length > 0 && isOutputRef(value[0]);
}
