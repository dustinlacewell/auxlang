/**
 * Poly expansion pass - processes nodes topologically, expanding and duplicating as needed.
 *
 * This pass runs after API execution, before compilation.
 * Nodes are processed in topological order (dependencies first).
 *
 * For each node:
 *   1. Count upstream voices (OutputRefs without voice field contribute their source's voice count)
 *   2. If polyphonic device: don't duplicate, call expand with poly inputs (or keep for processAll)
 *   3. Else if upstream is poly: duplicate N times, call expand on each if it has one
 *   4. Else: keep as-is, call expand if it has one
 *
 * OutputRef with voice field pins to that specific voice and doesn't trigger expansion.
 */

import { getDeviceSpec } from "../device/registry";
import { resetNodeCounter } from "./create-node";
import type { FlatGraph } from "./flat-graph";
import { withBuilder } from "./graph-builder";
import type { Node, NodeId } from "./node";
import type { OutputRef } from "./output-ref";
import type { NodeInput } from "../signal/node-input";
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
 * Handles poly duplication and device expansion.
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

		// Determine voice count from upstream poly sources
		// OutputRefs with voice field are pinned and don't contribute
		const upstreamVoiceCount = getUpstreamVoiceCount(node.inputs, nodeMap);

		if (spec?.polyphonic) {
			// Polyphonic device: don't duplicate
			const resolvedInputs = resolveInputs(node.inputs, nodeMap);

			if (spec.expand) {
				// Use withBuilder to capture ALL nodes created during expand (including intermediates)
				const { result, nodes: createdNodes } = withBuilder(() =>
					spec.expand!(node.config, resolvedInputs),
				);
				const outputNodes = Array.isArray(result) ? result : [result];
				const expandedNodes = outputNodes.map(extractNode);
				// Add intermediate nodes (those not in output), then output nodes
				const outputIds = new Set(expandedNodes.map((n) => n.id));
				const intermediateNodes = createdNodes.filter((n) => !outputIds.has(n.id));
				newNodes.push(...intermediateNodes);
				newNodes.push(...expandedNodes);
				nodeMap.set(node.id, expandedNodes.map((n) => n.id));
			} else {
				const newNode: Node = { ...node, inputs: resolvedInputs };
				newNodes.push(newNode);
				nodeMap.set(node.id, [node.id]);
			}
		} else if (upstreamVoiceCount > 1) {
			// Upstream is poly - duplicate this node for each voice
			const cloneIds: NodeId[] = [];

			for (let v = 0; v < upstreamVoiceCount; v++) {
				const voiceInputs = pickVoiceInputs(node.inputs, v, nodeMap);

				if (spec?.expand) {
					// Use withBuilder to capture ALL nodes created during expand
					const { result, nodes: createdNodes } = withBuilder(() =>
						spec.expand!(node.config, voiceInputs),
					);
					const outputNodes = Array.isArray(result) ? result : [result];
					const expandedNodes = outputNodes.map(extractNode);
					// Add intermediate nodes (those not in output), then output nodes
					const outputIds = new Set(expandedNodes.map((n) => n.id));
					const intermediateNodes = createdNodes.filter((n) => !outputIds.has(n.id));
					newNodes.push(...intermediateNodes);
					newNodes.push(...expandedNodes);

					const lastNode = expandedNodes[expandedNodes.length - 1]!;
					cloneIds.push(lastNode.id);
				} else {
					const newId = `${node.id}.${v}`;
					const newNode: Node = { ...node, id: newId, inputs: voiceInputs };
					newNodes.push(newNode);
					cloneIds.push(newId);
				}
			}

			nodeMap.set(node.id, cloneIds);
		} else {
			// Mono - no duplication needed
			const resolvedInputs = resolveInputs(node.inputs, nodeMap);

			if (spec?.expand) {
				// Use withBuilder to capture ALL nodes created during expand
				const { result, nodes: createdNodes } = withBuilder(() =>
					spec.expand!(node.config, resolvedInputs),
				);
				const outputNodes = Array.isArray(result) ? result : [result];
				const expandedNodes = outputNodes.map(extractNode);
				// Add intermediate nodes (those not in output), then output nodes
				const outputIds = new Set(expandedNodes.map((n) => n.id));
				const intermediateNodes = createdNodes.filter((n) => !outputIds.has(n.id));
				newNodes.push(...intermediateNodes);
				newNodes.push(...expandedNodes);
				nodeMap.set(node.id, expandedNodes.map((n) => n.id));
			} else {
				const newNode: Node = { ...node, inputs: resolvedInputs };
				newNodes.push(newNode);
				nodeMap.set(node.id, [node.id]);
			}
		}
	}

	// Find out nodes and distribute L/R
	const outNodes = graph.nodes.filter((n) => n.device === "out");
	const leftOutputIds: NodeId[] = [];
	const rightOutputIds: NodeId[] = [];

	for (const outNode of outNodes) {
		const expandedIds = nodeMap.get(outNode.id) || [outNode.id];

		if (expandedIds.length === 1) {
			leftOutputIds.push(expandedIds[0]!);
			rightOutputIds.push(expandedIds[0]!);
		} else {
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
 * Get the voice count from upstream nodes.
 * OutputRefs with voice field are pinned and contribute 1.
 * OutputRefs without voice field contribute their source's voice count.
 */
function getUpstreamVoiceCount(
	inputs: Record<string, unknown>,
	nodeMap: Map<NodeId, NodeId[]>,
): number {
	let maxCount = 1;

	for (const value of Object.values(inputs)) {
		if (isNumberArray(value)) {
			maxCount = Math.max(maxCount, value.length);
		} else if (isOutputRefArray(value)) {
			maxCount = Math.max(maxCount, value.length);
		} else if (isOutputRef(value)) {
			// Pinned voice refs don't trigger expansion
			if (value.voice !== undefined) {
				continue;
			}
			const upstreamIds = nodeMap.get(value.ref);
			if (upstreamIds) {
				maxCount = Math.max(maxCount, upstreamIds.length);
			}
		}
	}

	return maxCount;
}

/**
 * Resolve all inputs for a mono node or polyphonic device.
 * Expands OutputRefs to arrays if upstream is poly (and not pinned).
 */
function resolveInputs(
	inputs: Record<string, unknown>,
	nodeMap: Map<NodeId, NodeId[]>,
): Record<string, NodeInput> {
	const result: Record<string, NodeInput> = {};

	for (const [key, value] of Object.entries(inputs)) {
		if (isOutputRef(value)) {
			if (value.voice !== undefined) {
				// Pinned: resolve to specific voice
				const upstreamIds = nodeMap.get(value.ref);
				if (upstreamIds) {
					const targetId = upstreamIds[value.voice % upstreamIds.length]!;
					result[key] = { ref: targetId, out: value.out };
				} else {
					result[key] = { ref: value.ref, out: value.out };
				}
			} else {
				// Not pinned: expand to array if poly
				const upstreamIds = nodeMap.get(value.ref);
				if (upstreamIds && upstreamIds.length > 1) {
					result[key] = upstreamIds.map((id): OutputRef => ({ ref: id, out: value.out }));
				} else if (upstreamIds && upstreamIds.length === 1) {
					result[key] = { ref: upstreamIds[0]!, out: value.out };
				} else {
					result[key] = value;
				}
			}
		} else if (isOutputRefArray(value)) {
			result[key] = value.map((ref) => {
				const upstreamIds = nodeMap.get(ref.ref);
				if (ref.voice !== undefined && upstreamIds) {
					const targetId = upstreamIds[ref.voice % upstreamIds.length]!;
					return { ref: targetId, out: ref.out };
				} else if (upstreamIds && upstreamIds.length === 1) {
					return { ref: upstreamIds[0]!, out: ref.out };
				}
				return ref;
			});
		} else if (isNumberArray(value)) {
			result[key] = value;
		} else {
			result[key] = value as NodeInput;
		}
	}

	return result;
}

/**
 * Pick inputs for a specific voice index during duplication.
 * Pinned refs resolve to their specific voice.
 * Non-pinned refs pick from the voice array.
 */
function pickVoiceInputs(
	inputs: Record<string, unknown>,
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
			if (ref.voice !== undefined && upstreamIds) {
				const targetId = upstreamIds[ref.voice % upstreamIds.length]!;
				result[key] = { ref: targetId, out: ref.out };
			} else if (upstreamIds && upstreamIds.length > 1) {
				result[key] = { ref: upstreamIds[voiceIndex % upstreamIds.length]!, out: ref.out };
			} else if (upstreamIds && upstreamIds.length === 1) {
				result[key] = { ref: upstreamIds[0]!, out: ref.out };
			} else {
				result[key] = ref;
			}
		} else if (isOutputRef(value)) {
			const upstreamIds = nodeMap.get(value.ref);
			if (value.voice !== undefined && upstreamIds) {
				// Pinned: always resolve to the specific voice
				const targetId = upstreamIds[value.voice % upstreamIds.length]!;
				result[key] = { ref: targetId, out: value.out };
			} else if (upstreamIds && upstreamIds.length > 1) {
				result[key] = { ref: upstreamIds[voiceIndex % upstreamIds.length]!, out: value.out };
			} else if (upstreamIds && upstreamIds.length === 1) {
				result[key] = { ref: upstreamIds[0]!, out: value.out };
			} else {
				result[key] = value;
			}
		} else {
			result[key] = value as NodeInput;
		}
	}

	return result;
}

function isNumberArray(value: unknown): value is number[] {
	return Array.isArray(value) && value.length > 0 && typeof value[0] === "number";
}

function isOutputRef(value: unknown): value is OutputRef {
	return typeof value === "object" && value !== null && "ref" in value && "out" in value;
}

function isOutputRefArray(value: unknown): value is OutputRef[] {
	return Array.isArray(value) && value.length > 0 && isOutputRef(value[0]);
}
