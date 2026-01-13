/**
 * Runtime graph - hydrated and ready to process samples.
 *
 * PERFORMANCE CRITICAL: This runs 44100+ times per second.
 * All per-sample work is pre-compiled in the constructor.
 * No object allocations, no string lookups, no iteration in the hot path.
 */

import { hydrateFunction } from "../../hydrate-function";
import type { WorkletInput, WorkletSpec, WorkletStereoGraph } from "../../worklet-types";
import type { CollectedStates } from "./collected-states";
import { deepCloneState } from "./deep-clone-state";

// ============================================================================
// Types
// ============================================================================

type ProcessFn = (
	inputs: Record<string, number>,
	config: Record<string, unknown>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => Record<string, number>;

type ProcessAllFn = (
	inputs: Record<string, number[]>,
	config: Record<string, unknown>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => Record<string, number>;

type LambdaFn = (state: Record<string, unknown>, sr: number, time: number) => number;

// Pre-compiled input resolver - no allocations per sample
type InputResolver = (sr: number, time: number) => void;

// Pre-compiled output copier
type OutputCopier = () => void;

interface RuntimeNode {
	id: string;
	process?: ProcessFn;
	processAll?: ProcessAllFn;
	// Pre-allocated input/config objects (reused every sample)
	inputs: Record<string, number>;
	inputArrays: Record<string, number[]>;
	config: Record<string, unknown>;
	state: Record<string, unknown>;
	outputs: Record<string, number>;
	// Pre-compiled functions for hot path
	resolveInputs: InputResolver;
	resolveInputArrays: InputResolver;
	copyOutputs: OutputCopier;
	// For state collection
	lambdaStates: Map<string, Record<string, unknown>>;
}

// ============================================================================
// Hydration
// ============================================================================

function createWasmProcess(instance: WebAssembly.Instance, spec: WorkletSpec): ProcessFn {
	const exports = instance.exports as Record<string, unknown>;
	const processExport = exports.process as ((input: number) => number) | undefined;
	if (!processExport) throw new Error("WASM module missing 'process' export");

	const inputNames = Object.keys(spec.inputs).sort();
	const setters: ((v: number) => void)[] = [];
	for (const name of inputNames) {
		const setter = exports[`set_${name}`] as ((v: number) => void) | undefined;
		if (setter) setters.push(setter);
	}

	const defaultInput = spec.defaultInput;
	const defaultOutput = spec.defaultOutput;

	return (inputs, _config, _state, _sampleRate) => {
		for (let i = 0; i < inputNames.length; i++) {
			setters[i]?.(inputs[inputNames[i]!] ?? 0);
		}
		return { [defaultOutput]: processExport(inputs[defaultInput] ?? 0) };
	};
}

// ============================================================================
// RuntimeGraph
// ============================================================================

export class RuntimeGraph {
	private nodes: RuntimeNode[] = [];
	private nodeOutputs: Record<string, number>[] = []; // Direct array access instead of Map
	private nodeIndexById = new Map<string, number>();
	private leftOutputIndices: number[] = [];
	private rightOutputIndices: number[] = [];
	private leftOutputKeys: string[] = [];
	private rightOutputKeys: string[] = [];
	private sampleCount = 0;
	private leftCount = 0;
	private rightCount = 0;
	private leftScale = 1;
	private rightScale = 1;

	constructor(
		graph: WorkletStereoGraph,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates?: CollectedStates,
		nodeMapping?: Map<string, string>,
	) {
		if (oldStates) this.sampleCount = oldStates.sampleCount;

		// Build node index first for fast lookup during compilation
		for (let i = 0; i < graph.nodes.length; i++) {
			this.nodeIndexById.set(graph.nodes[i]!.id, i);
		}

		// Build nodes
		for (let i = 0; i < graph.nodes.length; i++) {
			const node = graph.nodes[i]!;
			const spec = graph.specs[node.device]!;
			const oldNodeId = nodeMapping?.get(node.id);

			const runtimeNode = this.buildNode(node, spec, wasmInstances.get(node.id), oldNodeId, oldStates);
			this.nodes.push(runtimeNode);
			this.nodeOutputs.push(runtimeNode.outputs);
		}

		// Pre-compile output mixing
		for (const id of graph.leftOutputIds) {
			const idx = this.nodeIndexById.get(id);
			if (idx !== undefined) {
				this.leftOutputIndices.push(idx);
				const node = this.nodes[idx]!;
				this.leftOutputKeys.push(Object.keys(node.outputs)[0] ?? "out");
			}
		}
		for (const id of graph.rightOutputIds) {
			const idx = this.nodeIndexById.get(id);
			if (idx !== undefined) {
				this.rightOutputIndices.push(idx);
				const node = this.nodes[idx]!;
				this.rightOutputKeys.push(Object.keys(node.outputs)[0] ?? "out");
			}
		}

		this.leftCount = this.leftOutputIndices.length;
		this.rightCount = this.rightOutputIndices.length;
		this.leftScale = this.leftCount > 1 ? 1 / Math.sqrt(this.leftCount) : 1;
		this.rightScale = this.rightCount > 1 ? 1 / Math.sqrt(this.rightCount) : 1;
	}

	private buildNode(
		node: WorkletStereoGraph["nodes"][number],
		spec: WorkletSpec,
		wasmInstance: WebAssembly.Instance | undefined,
		oldNodeId: string | undefined,
		oldStates: CollectedStates | undefined,
	): RuntimeNode {
		// Restore state from matched old node
		let state: Record<string, unknown> = {};
		if (oldNodeId && oldStates?.nodeStates.has(oldNodeId)) {
			state = deepCloneState(oldStates.nodeStates.get(oldNodeId)!);
		}

		// Hydrate process or processAll (WASM or JS)
		let process: ProcessFn | undefined;
		let processAll: ProcessAllFn | undefined;

		if (wasmInstance) {
			process = createWasmProcess(wasmInstance, spec);
		} else if (spec.processAllSource) {
			processAll = hydrateFunction(spec.processAllSource) as ProcessAllFn;
		} else if (spec.processSource) {
			process = hydrateFunction(spec.processSource) as ProcessFn;
		}

		// Pre-allocate input objects
		const inputs: Record<string, number> = {};
		const inputArrays: Record<string, number[]> = {};
		for (const name of Object.keys(spec.inputs)) {
			inputs[name] = spec.inputs[name]!.default;
			inputArrays[name] = [spec.inputs[name]!.default];
		}

		// Pre-allocate config object
		const config: Record<string, unknown> = {};
		const configGetters: (() => unknown)[] = [];
		const configKeys: string[] = [];
		for (const [name, cfg] of Object.entries(node.config)) {
			configKeys.push(name);
			if (cfg.type === "fn") {
				const fn = hydrateFunction(cfg.source);
				configGetters.push(() => fn);
			} else {
				const value = cfg.value;
				configGetters.push(() => value);
			}
		}

		// Pre-allocate outputs
		const outputs: Record<string, number> = {};
		const outputKeys: string[] = [];
		for (const out of spec.outputs) {
			outputs[out] = 0;
			outputKeys.push(out);
		}

		// Lambda states for this node
		const lambdaStates = new Map<string, Record<string, unknown>>();

		// Build pre-compiled input resolvers
		const inputResolvers: Array<(sr: number, time: number) => number> = [];
		const inputNames: string[] = [];

		for (const [name, input] of Object.entries(node.inputs)) {
			inputNames.push(name);

			if (input.type === "constant") {
				const value = input.value;
				inputResolvers.push(() => value);
			} else if (input.type === "connection") {
				const srcIdx = this.nodeIndexById.get(input.nodeId);
				const srcOutput = input.output;
				if (srcIdx !== undefined) {
					inputResolvers.push(() => this.nodeOutputs[srcIdx]![srcOutput] ?? 0);
				} else {
					inputResolvers.push(() => 0);
				}
			} else if (input.type === "connectionArray") {
				const connections = input.connections.map((c) => ({
					idx: this.nodeIndexById.get(c.nodeId),
					output: c.output,
				}));
				// For scalar, just take first
				if (connections.length > 0 && connections[0]!.idx !== undefined) {
					const firstIdx = connections[0]!.idx;
					const firstOutput = connections[0]!.output;
					inputResolvers.push(() => this.nodeOutputs[firstIdx]![firstOutput] ?? 0);
				} else {
					inputResolvers.push(() => 0);
				}
			} else {
				// Lambda
				const fn = hydrateFunction(input.source) as LambdaFn;
				const lambdaKey = `${node.id}:${name}`;
				const oldLambdaKey = oldNodeId ? `${oldNodeId}:${name}` : undefined;

				let lambdaState: Record<string, unknown> = {};
				if (oldLambdaKey && oldStates?.lambdaStates.has(oldLambdaKey)) {
					lambdaState = deepCloneState(oldStates.lambdaStates.get(oldLambdaKey)!);
				}
				lambdaStates.set(lambdaKey, lambdaState);

				inputResolvers.push((sr, time) => fn(lambdaState, sr, time));
			}
		}

		// Apply defaults for missing inputs
		for (const [name, def] of Object.entries(spec.inputs)) {
			if (!inputNames.includes(name)) {
				inputNames.push(name);
				const value = def.default;
				inputResolvers.push(() => value);
			}
		}

		// Build array resolvers for processAll
		const arrayResolvers: Array<() => number[]> = [];
		const arrayInputNames: string[] = [];

		for (const [name, input] of Object.entries(node.inputs)) {
			arrayInputNames.push(name);

			if (input.type === "constant") {
				const arr = [input.value];
				arrayResolvers.push(() => arr);
			} else if (input.type === "connection") {
				const srcIdx = this.nodeIndexById.get(input.nodeId);
				const srcOutput = input.output;
				if (srcIdx !== undefined) {
					arrayResolvers.push(() => [this.nodeOutputs[srcIdx]![srcOutput] ?? 0]);
				} else {
					arrayResolvers.push(() => [0]);
				}
			} else if (input.type === "connectionArray") {
				const connections = input.connections.map((c) => ({
					idx: this.nodeIndexById.get(c.nodeId),
					output: c.output,
				}));
				arrayResolvers.push(() => {
					const result: number[] = [];
					for (const conn of connections) {
						if (conn.idx !== undefined) {
							result.push(this.nodeOutputs[conn.idx]![conn.output] ?? 0);
						} else {
							result.push(0);
						}
					}
					return result;
				});
			} else {
				// Lambda - not fully supported in array context
				arrayResolvers.push(() => [0]);
			}
		}

		// Apply defaults for array resolvers
		for (const [name, def] of Object.entries(spec.inputs)) {
			if (!arrayInputNames.includes(name)) {
				arrayInputNames.push(name);
				const arr = [def.default];
				arrayResolvers.push(() => arr);
			}
		}

		// Pre-compiled resolve functions
		const resolveInputs: InputResolver = (sr, time) => {
			for (let i = 0; i < inputNames.length; i++) {
				inputs[inputNames[i]!] = inputResolvers[i]!(sr, time);
			}
			for (let i = 0; i < configKeys.length; i++) {
				config[configKeys[i]!] = configGetters[i]!();
			}
		};

		const resolveInputArrays: InputResolver = (_sr, _time) => {
			for (let i = 0; i < arrayInputNames.length; i++) {
				inputArrays[arrayInputNames[i]!] = arrayResolvers[i]!();
			}
			for (let i = 0; i < configKeys.length; i++) {
				config[configKeys[i]!] = configGetters[i]!();
			}
		};

		// Pre-compiled output copier
		const copyOutputs: OutputCopier = () => {
			// outputs are modified in place by process(), no copy needed
		};

		return {
			id: node.id,
			process,
			processAll,
			inputs,
			inputArrays,
			config,
			state,
			outputs,
			resolveInputs,
			resolveInputArrays,
			copyOutputs,
			lambdaStates,
		};
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
				const result = node.processAll(node.inputArrays, node.config, node.state, sr, time);
				// Copy results to outputs
				for (const key in result) {
					node.outputs[key] = result[key]!;
				}
			} else if (node.process) {
				node.resolveInputs(sr, time);
				const result = node.process(node.inputs, node.config, node.state, sr, time);
				// Copy results to outputs
				for (const key in result) {
					node.outputs[key] = result[key]!;
				}
			}
		}

		// Mix outputs - direct array access, no Map lookup
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
