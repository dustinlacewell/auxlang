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

	/**
	 * Dump all node outputs and critical state for comparison.
	 */
	dumpNodeStates(): Map<string, { outputs: Record<string, number>; state: Record<string, unknown> }> {
		const dump = new Map<string, { outputs: Record<string, number>; state: Record<string, unknown> }>();
		for (const node of this.nodes) {
			dump.set(node.id, {
				outputs: { ...node.outputs },
				state: { ...node.state },
			});
		}
		return dump;
	}

	/**
	 * Compare two graphs' node states and log differences.
	 */
	static compareGraphs(
		label: string,
		oldDump: Map<string, { outputs: Record<string, number>; state: Record<string, unknown> }>,
		newDump: Map<string, { outputs: Record<string, number>; state: Record<string, unknown> }>,
	): void {
		console.log(`\n=== ${label} ===`);
		for (const [nodeId, oldData] of oldDump) {
			const newData = newDump.get(nodeId);
			if (!newData) {
				console.log(`  [${nodeId}] MISSING in new graph!`);
				continue;
			}

			// Compare outputs
			let outputsDiffer = false;
			const outputDiffs: string[] = [];
			for (const key of Object.keys(oldData.outputs)) {
				const oldVal = oldData.outputs[key] ?? 0;
				const newVal = newData.outputs[key] ?? 0;
				if (Math.abs(oldVal - newVal) > 0.0001) {
					outputsDiffer = true;
					outputDiffs.push(`${key}: ${oldVal.toFixed(4)} vs ${newVal.toFixed(4)}`);
				}
			}

			if (outputsDiffer) {
				console.log(`  [${nodeId}] OUTPUT MISMATCH: ${outputDiffs.join(", ")}`);
			}

			// Compare critical state (skip complex objects like cursor)
			const stateKeys = ["beatIndex", "phase", "level", "stage", "wasGate", "samplesPerBeat", "samplesSinceTrig"];
			const stateDiffs: string[] = [];
			for (const key of stateKeys) {
				const oldVal = oldData.state[key];
				const newVal = newData.state[key];
				if (oldVal !== undefined || newVal !== undefined) {
					if (typeof oldVal === "number" && typeof newVal === "number") {
						if (Math.abs(oldVal - newVal) > 0.0001) {
							stateDiffs.push(`${key}: ${oldVal.toFixed(2)} vs ${newVal.toFixed(2)}`);
						}
					} else if (oldVal !== newVal) {
						stateDiffs.push(`${key}: ${JSON.stringify(oldVal)} vs ${JSON.stringify(newVal)}`);
					}
				}
			}
			if (stateDiffs.length > 0) {
				console.log(`  [${nodeId}] STATE MISMATCH: ${stateDiffs.join(", ")}`);
			}
		}

		// Check for nodes in new but not in old
		for (const nodeId of newDump.keys()) {
			if (!oldDump.has(nodeId)) {
				console.log(`  [${nodeId}] NEW node not in old graph`);
			}
		}
	}
}
