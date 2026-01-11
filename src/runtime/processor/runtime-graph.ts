import { hydrateConfig, hydrateProcess } from "./hydrate";
import type { CompiledGraph, CompiledNode, ConfigVal, SerializedSpec } from "./types";

/**
 * Deep clone that preserves TypedArrays (Float32Array, etc.).
 * JSON.parse/stringify loses TypedArrays - they become plain objects.
 */
function deepCloneState(obj: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		result[key] = cloneValue(value);
	}
	return result;
}

/** Clone a single value, handling TypedArrays, arrays, and objects recursively */
function cloneValue(value: unknown): unknown {
	if (value instanceof Float32Array) {
		return new Float32Array(value);
	}
	if (value instanceof Float64Array) {
		return new Float64Array(value);
	}
	if (value instanceof Int32Array) {
		return new Int32Array(value);
	}
	if (value instanceof Uint8Array) {
		return new Uint8Array(value);
	}
	if (Array.isArray(value)) {
		return value.map(cloneValue);
	}
	if (value && typeof value === "object" && !ArrayBuffer.isView(value)) {
		return deepCloneState(value as Record<string, unknown>);
	}
	// Primitives - copy directly
	return value;
}

/**
 * Create a process function from a WASM module instance.
 *
 * WASM instances are expected to already be initialized (init() called)
 * by the processor before being passed here.
 *
 * WASM devices must export:
 * - process(input: number): number  (mono in, mono out)
 * - set_<inputName>(value: number): void for each non-default input
 */
function hydrateWasmProcess(
	instance: WebAssembly.Instance,
	spec: SerializedSpec,
): OptimizedNode["process"] {
	const exports = instance.exports as Record<string, unknown>;
	const processExport = exports.process as ((input: number) => number) | undefined;

	if (!processExport) {
		throw new Error("WASM module missing 'process' export");
	}

	// Collect setter functions for non-default inputs
	const inputNames = Object.keys(spec.inputs).sort();
	const setters: Record<string, (v: number) => void> = {};
	for (const name of inputNames) {
		const setter = exports[`set_${name}`] as ((v: number) => void) | undefined;
		if (setter) {
			setters[name] = setter;
		}
	}

	return (inputs, _config, _state, _sampleRate) => {
		// Update parameters via setters (inputs are plain numbers now)
		for (const name of inputNames) {
			const setter = setters[name];
			if (setter) {
				setter(inputs[name] ?? 0);
			}
		}

		// Get main input and process through WASM
		const monoInput = inputs[spec.defaultInput] ?? 0;
		const output = processExport(monoInput);

		return { [spec.defaultOutput]: output };
	};
}

/** Hydrated signal lambda function */
type HydratedLambda = (state: Record<string, unknown>, sampleRate: number, time: number) => number;

/**
 * Pre-computed binding for resolving a node input.
 * Built once at hydration, used every sample without allocation.
 */
type InputBinding =
	| { type: "constant"; value: number }
	| { type: "connection"; sourceNodeIndex: number; outputName: string }
	| { type: "lambda"; fn: HydratedLambda; state: Record<string, unknown> }
	| { type: "connections"; sources: { sourceNodeIndex: number; outputName: string }[] };

/** Hydrated processAll function for polyphonic devices */
type HydratedProcessAll = (
	inputs: Record<string, number | number[]>,
	config: Record<string, ConfigVal>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => Record<string, number>;

/**
 * Optimized runtime node with pre-allocated storage.
 * All signals are plain numbers - polyphony handled at graph construction.
 */
interface OptimizedNode {
	/** Original node ID (for state preservation across graph swaps) */
	id: string;

	/** The hydrated process function (for non-polyphonic devices) */
	process: (
		inputs: Record<string, number>,
		config: Record<string, ConfigVal>,
		state: Record<string, unknown>,
		sampleRate: number,
		time: number,
	) => Record<string, number>;

	/** The hydrated processAll function (for polyphonic devices) */
	processAll?: HydratedProcessAll;

	/** Whether this node is polyphonic (uses processAll instead of process) */
	isPolyphonic: boolean;

	/** Hydrated config values (functions or data) */
	config: Record<string, ConfigVal>;

	/** Mutable state for the device */
	state: Record<string, unknown>;

	/** Default output name for final node */
	defaultOutput: string;

	/** Pre-allocated input record (mutated in place each sample) */
	inputRecord: Record<string, number | number[]>;

	/** Pre-allocated output record (mutated in place each sample) */
	outputRecord: Record<string, number>;

	/** Pre-computed input bindings (index aligns with inputNames) */
	inputBindings: InputBinding[];

	/** Input names in stable order (for populating inputRecord) */
	inputNames: string[];

	/** Output names in stable order (for reading from process result) */
	outputNames: string[];
}

/**
 * Pre-allocated graph structure for efficient sample-by-sample processing.
 *
 * All allocations happen at construction time. The process loop only
 * mutates pre-existing objects, avoiding GC pressure in the audio thread.
 */
/** Collected states for graph swap preservation */
export interface CollectedStates {
	nodeStates: Map<string, Record<string, unknown>>;
	lambdaStates: Map<string, Record<string, unknown>>; // key: "nodeId:inputName"
	sampleCount: number;
}

export class RuntimeGraph {
	/** Nodes in topological order (dependencies before dependents) */
	readonly nodes: OptimizedNode[];

	/** Index of the output node in the nodes array */
	readonly outputNodeIndex: number;

	/** Lambda states keyed by "nodeId:inputName" for state preservation */
	private lambdaStates: Map<string, Record<string, unknown>> = new Map();

	/** Sample count since graph creation (for time calculation) */
	private sampleCount = 0;

	constructor(
		compiledGraph: CompiledGraph,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates?: CollectedStates,
		nodeMapping?: Map<string, string>,
	) {
		// Build node ID to index map for resolving connections
		const idToIndex = new Map<string, number>();
		for (let i = 0; i < compiledGraph.nodes.length; i++) {
			const node = compiledGraph.nodes[i];
			if (node) {
				idToIndex.set(node.id, i);
			}
		}

		// Find output node index
		const outputIndex = idToIndex.get(compiledGraph.outputNodeId);
		if (outputIndex === undefined) {
			throw new Error(`Output node ${compiledGraph.outputNodeId} not found`);
		}
		this.outputNodeIndex = outputIndex;

		// Restore sample count from previous graph if available
		if (oldStates) {
			this.sampleCount = oldStates.sampleCount;
		}

		// Build optimized nodes
		this.nodes = compiledGraph.nodes.map((compiledNode) => {
			return this.buildOptimizedNode(
				compiledNode,
				idToIndex,
				wasmInstances,
				oldStates,
				nodeMapping,
			);
		});
	}

	private buildOptimizedNode(
		compiledNode: CompiledNode,
		idToIndex: Map<string, number>,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates?: CollectedStates,
		nodeMapping?: Map<string, string>,
	): OptimizedNode {
		// Restore state from matched old node if available
		let state: Record<string, unknown> = {};
		let oldNodeId: string | undefined;
		if (oldStates && nodeMapping) {
			oldNodeId = nodeMapping.get(compiledNode.id);
			if (oldNodeId) {
				const oldState = oldStates.nodeStates.get(oldNodeId);
				if (oldState) {
					// Deep clone preserving TypedArrays (delay buffers, etc.)
					state = deepCloneState(oldState);
				}
			}
		}

		// Get input/output names in stable order
		const inputNames = Object.keys(compiledNode.inputs).sort();
		const outputNames = [...compiledNode.spec.outputs].sort();

		// Pre-allocate input/output records with zero values
		const inputRecord: Record<string, number | number[]> = {};
		for (const name of inputNames) {
			inputRecord[name] = 0;
		}

		const outputRecord: Record<string, number> = {};
		for (const name of outputNames) {
			outputRecord[name] = 0;
		}

		// Build input bindings - constants are plain numbers, connections resolve to nodes
		const inputBindings: InputBinding[] = inputNames.map((name) => {
			const input = compiledNode.inputs[name];
			if (!input || input.type === "constant") {
				// Take first value from legacy array format, or 0
				const legacyValue = input?.value ?? [0];
				return { type: "constant", value: legacyValue[0] ?? 0 };
			}
			if (input.type === "lambda") {
				// Hydrate lambda function from source string
				// biome-ignore lint/security/noGlobalEval: required for dynamic function hydration
				const fn = new Function(`return (${input.fnSource})`)() as HydratedLambda;

				// Restore lambda state from previous graph if available
				const lambdaKey = `${compiledNode.id}:${name}`;
				const oldLambdaKey = oldNodeId ? `${oldNodeId}:${name}` : undefined;
				let lambdaState: Record<string, unknown> = {};
				if (oldLambdaKey && oldStates?.lambdaStates.has(oldLambdaKey)) {
					lambdaState = deepCloneState(oldStates.lambdaStates.get(oldLambdaKey)!);
				}
				// Store in our lambda states map for future preservation
				this.lambdaStates.set(lambdaKey, lambdaState);

				return { type: "lambda", fn, state: lambdaState };
			}
			if (input.type === "connections") {
				// Multi-connection for polyphonic devices
				const sources = (input.sources ?? []).map((src) => {
					const idx = idToIndex.get(src.nodeId);
					return {
						sourceNodeIndex: idx ?? 0,
						outputName: src.output,
					};
				});
				return { type: "connections", sources };
			}
			const sourceIndex = idToIndex.get(input.nodeId ?? "");
			if (sourceIndex === undefined) {
				return { type: "constant", value: 0 };
			}
			return {
				type: "connection",
				sourceNodeIndex: sourceIndex,
				outputName: input.output ?? "out",
			};
		});

		// Hydrate process function - either from JS source or WASM
		let process: OptimizedNode["process"];
		const wasmInstance = wasmInstances.get(compiledNode.id);
		if (wasmInstance) {
			process = hydrateWasmProcess(wasmInstance, compiledNode.spec);
		} else {
			process = hydrateProcess(compiledNode.spec.processSource);
		}

		// Check if this is a polyphonic device and hydrate processAll
		const isPolyphonic = compiledNode.spec.polyphonic ?? false;
		let processAll: HydratedProcessAll | undefined;
		if (isPolyphonic && compiledNode.spec.processAllSource) {
			// biome-ignore lint/security/noGlobalEval: required for dynamic function hydration
			processAll = new Function(`return (${compiledNode.spec.processAllSource})`)() as HydratedProcessAll;
		}

		const node: OptimizedNode = {
			id: compiledNode.id,
			process,
			isPolyphonic,
			config: hydrateConfig(compiledNode.config),
			state,
			defaultOutput: compiledNode.spec.defaultOutput,
			inputRecord,
			outputRecord,
			inputBindings,
			inputNames,
			outputNames,
		};
		if (processAll) {
			node.processAll = processAll;
		}
		return node;
	}

	/**
	 * Process one sample through the graph.
	 * Returns the output signal (mono).
	 */
	processSample(sampleRate: number): number {
		// Calculate time in seconds
		const time = this.sampleCount / sampleRate;
		this.sampleCount++;

		// Process each node in topological order
		for (let i = 0; i < this.nodes.length; i++) {
			const node = this.nodes[i];
			if (!node) continue;

			// Resolve inputs by mutating pre-allocated inputRecord
			for (let j = 0; j < node.inputBindings.length; j++) {
				const binding = node.inputBindings[j];
				const inputName = node.inputNames[j];
				if (!binding || !inputName) continue;

				if (binding.type === "constant") {
					node.inputRecord[inputName] = binding.value;
				} else if (binding.type === "lambda") {
					// Execute lambda with its own persistent state
					node.inputRecord[inputName] = binding.fn(binding.state, sampleRate, time);
				} else if (binding.type === "connections") {
					// Multi-connection for polyphonic devices - gather all source values
					const values = binding.sources.map((src) => {
						const sourceNode = this.nodes[src.sourceNodeIndex];
						return sourceNode?.outputRecord[src.outputName] ?? 0;
					});
					node.inputRecord[inputName] = values;
				} else {
					// Single connection reads from current sample
					const sourceNode = this.nodes[binding.sourceNodeIndex];
					if (sourceNode) {
						node.inputRecord[inputName] = sourceNode.outputRecord[binding.outputName] ?? 0;
					}
				}
			}

			// Call the device's process function (or processAll for polyphonic)
			let result: Record<string, number>;
			if (node.isPolyphonic && node.processAll) {
				result = node.processAll(node.inputRecord, node.config, node.state, sampleRate, time);
			} else {
				// Cast inputRecord to mono for non-polyphonic devices
				result = node.process(node.inputRecord as Record<string, number>, node.config, node.state, sampleRate, time);
			}

			// Copy results to pre-allocated outputRecord
			for (const outputName of node.outputNames) {
				const value = result[outputName];
				if (value !== undefined) {
					node.outputRecord[outputName] = value;
				}
			}
		}

		// Get output from the output node
		const outputNode = this.nodes[this.outputNodeIndex];
		if (!outputNode) return 0;

		return outputNode.outputRecord[outputNode.defaultOutput] ?? 0;
	}

	/**
	 * Collect current state from all nodes (for state preservation during graph swap).
	 */
	collectStates(): CollectedStates {
		const nodeStates = new Map<string, Record<string, unknown>>();
		for (const node of this.nodes) {
			nodeStates.set(node.id, node.state);
		}
		return {
			nodeStates,
			lambdaStates: this.lambdaStates,
			sampleCount: this.sampleCount,
		};
	}
}
