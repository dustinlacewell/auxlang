/**
 * Graph swap with state preservation.
 */

import { diffStereoGraphs } from "../../topology-hash";
import type { WorkletStereoGraph } from "../../worklet-types";
import type { CollectedStates } from "./collected-states";
import { RuntimeGraph } from "./runtime-graph";
import { deserializeWasmState, initWasm, instantiateWasm, serializeWasmState } from "./wasm-state";

declare const sampleRate: number;

export interface SwapResult {
	graph: RuntimeGraph;
	wasmInstances: Map<string, WebAssembly.Instance>;
	oldGraph: RuntimeGraph | null;
}

export async function swapGraph(
	newGraph: WorkletStereoGraph,
	oldGraph: WorkletStereoGraph | null,
	oldWasmInstances: Map<string, WebAssembly.Instance>,
	oldRuntimeGraph: RuntimeGraph | null,
): Promise<SwapResult> {
	const nodeMapping = oldGraph ? diffStereoGraphs(oldGraph, newGraph) : undefined;
	const newWasmInstances = await createWasmInstances(newGraph, nodeMapping, oldWasmInstances);
	const oldStates = oldRuntimeGraph?.collectStates();
	const graph = new RuntimeGraph(newGraph, newWasmInstances, oldStates, nodeMapping);

	return { graph, wasmInstances: newWasmInstances, oldGraph: oldRuntimeGraph };
}

/**
 * Create fresh WASM instances for all WASM nodes.
 * We can't reuse instances because crossfade runs both graphs simultaneously.
 * State is transferred via serialization/deserialization.
 */
async function createWasmInstances(
	graph: WorkletStereoGraph,
	nodeMapping: Map<string, string> | undefined,
	oldWasmInstances: Map<string, WebAssembly.Instance>,
): Promise<Map<string, WebAssembly.Instance>> {
	const instances = new Map<string, WebAssembly.Instance>();
	const wasmNodes = graph.nodes.filter((n) => n.wasmBytes);

	// Collect state from old instances for matched nodes
	const wasmStates = new Map<string, Float32Array>();
	if (nodeMapping) {
		for (const [newNodeId, oldNodeId] of nodeMapping) {
			const oldInstance = oldWasmInstances.get(oldNodeId);
			if (oldInstance) {
				const state = serializeWasmState(oldInstance);
				if (state) wasmStates.set(newNodeId, state);
			}
		}
	}

	// Instantiate all WASM nodes fresh
	await Promise.all(
		wasmNodes.map(async (node) => {
			const instance = await instantiateWasm(node.wasmBytes!);
			instances.set(node.id, instance);
		}),
	);

	// Initialize and restore state
	for (const [nodeId, instance] of instances) {
		initWasm(instance, sampleRate);
		const savedState = wasmStates.get(nodeId);
		if (savedState) deserializeWasmState(instance, savedState);
	}

	return instances;
}
