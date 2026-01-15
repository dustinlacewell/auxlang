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
import { MetricsAccumulator, type NodeMetrics, type SequencerMetrics } from "./visualization-metrics";
import type { ProcessContext } from "../../../device/process-fn";

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

	private metricsAccumulator = new MetricsAccumulator();
	private visualizationCounter = 0;
	private readonly VISUALIZATION_INTERVAL = 735;
	private sequencerNodes = new Set<number>();
	private specs: Record<string, { defaultInput: string }> = {};
	private deviceNames: string[] = [];
	
	// Active elements callback - emits current active set from sequencers
	private activeElementsCallback?: (activeIds: string[]) => void;

	// Accumulate active elements within a sample (multiple seq nodes may emit)
	private pendingActive: Set<string> = new Set();
	private lastActiveSet: string = ""; // For change detection

	constructor(
		graph: WorkletStereoGraph,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates?: CollectedStates,
		nodeMapping?: Map<string, string>,
	) {
		if (oldStates) this.sampleCount = oldStates.sampleCount;

		this.specs = graph.specs;
		this.buildNodeIndex(graph);
		this.buildNodes(graph, wasmInstances, oldStates, nodeMapping);
		this.buildOutputMixing(graph);
		this.identifySequencers(graph);
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
			this.deviceNames.push(node.device);
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

	private identifySequencers(graph: WorkletStereoGraph): void {
		for (let i = 0; i < graph.nodes.length; i++) {
			if (graph.nodes[i]!.device === "seq") {
				this.sequencerNodes.add(i);
			}
		}
	}

	/**
	 * Process one sample and return stereo output [left, right].
	 * PERFORMANCE CRITICAL - no allocations, no string lookups.
	 */
	processStereoSample(sr: number): [number, number] {
		const time = this.sampleCount / sr;
		this.sampleCount++;

		// Clear pending active set from previous sample
		this.pendingActive.clear();

		// Process all nodes
		const nodes = this.nodes;
		const len = nodes.length;
		const ctx = this.createProcessContext();

		for (let i = 0; i < len; i++) {
			const node = nodes[i]!;

			if (node.processAll) {
				node.resolveInputArrays(sr, time);
				node.processAll(node.inputArrays, node.config, node.state, sr, time, node.outputs, ctx);
			} else if (node.process) {
				node.resolveInputs(sr, time);
				node.process(node.inputs, node.config, node.state, sr, time, node.outputs, ctx);
			}
		}

		// Emit active elements if changed (batched from all seq nodes)
		if (this.activeElementsCallback) {
			const activeArray = Array.from(this.pendingActive).sort();
			const activeKey = activeArray.join(",");
			if (activeKey !== this.lastActiveSet) {
				this.lastActiveSet = activeKey;
				this.activeElementsCallback(activeArray);
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

		this.accumulateVisualizationMetrics();

		return [left * this.leftScale, right * this.rightScale];
	}

	setActiveElementsCallback(callback: (activeIds: string[]) => void): void {
		this.activeElementsCallback = callback;
	}

	private createProcessContext(): ProcessContext {
		return {
			emitActiveElements: (activeIds: string[]) => {
				// Accumulate into pending set - will be batched and emitted after all nodes process
				for (const id of activeIds) {
					this.pendingActive.add(id);
				}
			},
		};
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

	private accumulateVisualizationMetrics(): void {
		for (let i = 0; i < this.nodes.length; i++) {
			if (this.sequencerNodes.has(i)) continue;

			const node = this.nodes[i]!;
			const deviceName = this.deviceNames[i]!;
			const spec = this.specs[deviceName];
			const defaultInput = spec?.defaultInput || "input";
			const value = node.inputs[defaultInput] ?? 0;

			this.metricsAccumulator.accumulate(node.id, value);
		}
	}

	collectVisualizationMetrics(): {
		audio: Map<string, NodeMetrics>;
		sequencers: Map<string, SequencerMetrics>;
	} | null {
		this.visualizationCounter++;

		if (this.visualizationCounter >= this.VISUALIZATION_INTERVAL) {
			this.visualizationCounter = 0;

			const audioMetrics = this.metricsAccumulator.collect();
			this.metricsAccumulator.reset();

			const seqMetrics = new Map<string, SequencerMetrics>();
			for (const idx of this.sequencerNodes) {
				const node = this.nodes[idx]!;
				const beatIndex = (node.state.beatIndex as number) ?? -1;
				const gate = node.outputs.gate ?? 0;
				const beatPositions = (node.config.beatPositions as Array<{ start: number; end: number }>) ?? [];
				
				const position = beatPositions[beatIndex] || { start: -1, end: -1 };

				seqMetrics.set(node.id, {
					beatIndex,
					isActive: beatIndex >= 0 && gate > 0,
					charStart: position.start,
					charEnd: position.end,
				});
			}

			return { audio: audioMetrics, sequencers: seqMetrics };
		}

		return null;
	}
}
