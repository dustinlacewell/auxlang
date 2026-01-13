/**
 * Runtime graph - hydrated and ready to process samples.
 *
 * PERFORMANCE CRITICAL: This runs 44100+ times per second.
 * All per-sample work is pre-compiled in the constructor.
 * No object allocations, no string lookups, no iteration in the hot path.
 */

import type { WorkletStereoGraph } from "../../worklet-types";
import type { CollectedStates } from "./collected-states";
import { buildRuntimeNode } from "./node/build-node";
import type { RuntimeNode } from "./node/types";

export class RuntimeGraph {
	private nodes: RuntimeNode[] = [];
	private nodeOutputs: Record<string, number>[] = [];
	private nodeIndexById = new Map<string, number>();

	// Pre-compiled output mixing
	private leftOutputIndices: number[] = [];
	private rightOutputIndices: number[] = [];
	private leftOutputKeys: string[] = [];
	private rightOutputKeys: string[] = [];
	private leftCount = 0;
	private rightCount = 0;
	private leftScale = 1;
	private rightScale = 1;

	private sampleCount = 0;

	constructor(
		graph: WorkletStereoGraph,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates?: CollectedStates,
		nodeMapping?: Map<string, string>,
	) {
		if (oldStates) this.sampleCount = oldStates.sampleCount;

		this.buildNodeIndex(graph);
		this.buildNodes(graph, wasmInstances, oldStates, nodeMapping);
		this.buildOutputMixing(graph);
	}

	private buildNodeIndex(graph: WorkletStereoGraph): void {
		for (let i = 0; i < graph.nodes.length; i++) {
			this.nodeIndexById.set(graph.nodes[i]!.id, i);
		}
	}

	private buildNodes(
		graph: WorkletStereoGraph,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates: CollectedStates | undefined,
		nodeMapping: Map<string, string> | undefined,
	): void {
		for (let i = 0; i < graph.nodes.length; i++) {
			const node = graph.nodes[i]!;
			const spec = graph.specs[node.device]!;

			const runtimeNode = buildRuntimeNode({
				node,
				spec,
				wasmInstance: wasmInstances.get(node.id),
				oldNodeId: nodeMapping?.get(node.id),
				oldStates,
				nodeIndexById: this.nodeIndexById,
				nodeOutputs: this.nodeOutputs,
			});

			this.nodes.push(runtimeNode);
			this.nodeOutputs.push(runtimeNode.outputs);
		}
	}

	private buildOutputMixing(graph: WorkletStereoGraph): void {
		for (const id of graph.leftOutputIds) {
			const idx = this.nodeIndexById.get(id);
			if (idx !== undefined) {
				this.leftOutputIndices.push(idx);
				this.leftOutputKeys.push(Object.keys(this.nodes[idx]!.outputs)[0] ?? "out");
			}
		}

		for (const id of graph.rightOutputIds) {
			const idx = this.nodeIndexById.get(id);
			if (idx !== undefined) {
				this.rightOutputIndices.push(idx);
				this.rightOutputKeys.push(Object.keys(this.nodes[idx]!.outputs)[0] ?? "out");
			}
		}

		this.leftCount = this.leftOutputIndices.length;
		this.rightCount = this.rightOutputIndices.length;
		this.leftScale = this.leftCount > 1 ? 1 / Math.sqrt(this.leftCount) : 1;
		this.rightScale = this.rightCount > 1 ? 1 / Math.sqrt(this.rightCount) : 1;
	}

	/**
	 * Process one sample and return stereo output [left, right].
	 * PERFORMANCE CRITICAL - no allocations, no string lookups.
	 */
	processStereoSample(sr: number): [number, number] {
		const time = this.sampleCount / sr;
		this.sampleCount++;

		// Process all nodes
		const nodes = this.nodes;
		const len = nodes.length;

		for (let i = 0; i < len; i++) {
			const node = nodes[i]!;

			if (node.processAll) {
				node.resolveInputArrays(sr, time);
				node.processAll(node.inputArrays, node.config, node.state, sr, time, node.outputs);
			} else if (node.process) {
				node.resolveInputs(sr, time);
				node.process(node.inputs, node.config, node.state, sr, time, node.outputs);
			}
		}

		// Mix outputs
		let left = 0;
		let right = 0;

		const leftIndices = this.leftOutputIndices;
		const leftKeys = this.leftOutputKeys;
		const rightIndices = this.rightOutputIndices;
		const rightKeys = this.rightOutputKeys;
		const nodeOutputs = this.nodeOutputs;

		for (let i = 0; i < this.leftCount; i++) {
			left += nodeOutputs[leftIndices[i]!]![leftKeys[i]!] ?? 0;
		}
		for (let i = 0; i < this.rightCount; i++) {
			right += nodeOutputs[rightIndices[i]!]![rightKeys[i]!] ?? 0;
		}

		return [left * this.leftScale, right * this.rightScale];
	}

	collectStates(): CollectedStates {
		const nodeStates = new Map<string, Record<string, unknown>>();
		const lambdaStates = new Map<string, Record<string, unknown>>();

		for (const node of this.nodes) {
			nodeStates.set(node.id, node.state);
			for (const [key, state] of node.lambdaStates) {
				lambdaStates.set(key, state);
			}
		}

		return { nodeStates, lambdaStates, sampleCount: this.sampleCount };
	}
}
