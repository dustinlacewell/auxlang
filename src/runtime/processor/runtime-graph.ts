import { hydrateConfig, hydrateProcess } from "./hydrate";
import type { CompiledGraph, CompiledNode, ConfigFn, SerializedSpec } from "./types";

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

/**
 * Pre-computed binding for resolving a node input.
 * Built once at hydration, used every sample without allocation.
 */
type InputBinding =
	| { type: "constant"; value: number }
	| { type: "connection"; sourceNodeIndex: number; outputName: string }
	| { type: "feedback"; sourceNodeIndex: number; outputName: string };

/**
 * Optimized runtime node with pre-allocated storage.
 * All signals are plain numbers - polyphony handled at graph construction.
 */
interface OptimizedNode {
	/** Original node ID (for state preservation across graph swaps) */
	id: string;

	/** The hydrated process function */
	process: (
		inputs: Record<string, number>,
		config: Record<string, ConfigFn>,
		state: Record<string, unknown>,
		sampleRate: number,
	) => Record<string, number>;

	/** Hydrated config functions */
	config: Record<string, ConfigFn>;

	/** Mutable state for the device */
	state: Record<string, unknown>;

	/** Default output name for final node */
	defaultOutput: string;

	/** Pre-allocated input record (mutated in place each sample) */
	inputRecord: Record<string, number>;

	/** Pre-allocated output record (mutated in place each sample) */
	outputRecord: Record<string, number>;

	/** Previous sample's outputs (for feedback - 1 sample delay) */
	previousOutputs: Record<string, number>;

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
export class RuntimeGraph {
	/** Nodes in topological order (dependencies before dependents) */
	readonly nodes: OptimizedNode[];

	/** Index of the output node in the nodes array */
	readonly outputNodeIndex: number;

	constructor(
		compiledGraph: CompiledGraph,
		wasmInstances: Map<string, WebAssembly.Instance>,
		oldStates?: Map<string, Record<string, unknown>>,
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
		oldStates?: Map<string, Record<string, unknown>>,
		nodeMapping?: Map<string, string>,
	): OptimizedNode {
		// Restore state from matched old node if available
		let state: Record<string, unknown> = {};
		if (oldStates && nodeMapping) {
			const oldNodeId = nodeMapping.get(compiledNode.id);
			if (oldNodeId) {
				const oldState = oldStates.get(oldNodeId);
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
		const inputRecord: Record<string, number> = {};
		for (const name of inputNames) {
			inputRecord[name] = 0;
		}

		const outputRecord: Record<string, number> = {};
		const previousOutputs: Record<string, number> = {};
		for (const name of outputNames) {
			outputRecord[name] = 0;
			previousOutputs[name] = 0;
		}

		// Build input bindings - constants are plain numbers, connections/feedback resolve to nodes
		const inputBindings: InputBinding[] = inputNames.map((name) => {
			const input = compiledNode.inputs[name];
			if (!input || input.type === "constant") {
				// Take first value from legacy array format, or 0
				const legacyValue = input?.value ?? [0];
				return { type: "constant", value: legacyValue[0] ?? 0 };
			}
			const sourceIndex = idToIndex.get(input.nodeId ?? "");
			if (sourceIndex === undefined) {
				return { type: "constant", value: 0 };
			}
			if (input.type === "feedback") {
				// Feedback reads from previous sample
				return {
					type: "feedback",
					sourceNodeIndex: sourceIndex,
					outputName: input.output ?? "out",
				};
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

		return {
			id: compiledNode.id,
			process,
			config: hydrateConfig(compiledNode.config),
			state,
			defaultOutput: compiledNode.spec.defaultOutput,
			inputRecord,
			outputRecord,
			previousOutputs,
			inputBindings,
			inputNames,
			outputNames,
		};
	}

	/**
	 * Process one sample through the graph.
	 * Returns the output signal (mono).
	 */
	processSample(sampleRate: number): number {
		// First, copy current outputs to previous for feedback (1-sample delay)
		// This must happen before processing so feedback reads the last sample
		for (let i = 0; i < this.nodes.length; i++) {
			const node = this.nodes[i];
			if (!node) continue;
			for (const outputName of node.outputNames) {
				node.previousOutputs[outputName] = node.outputRecord[outputName];
			}
		}

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
				} else if (binding.type === "feedback") {
					// Feedback reads from PREVIOUS sample (1-sample delay)
					const sourceNode = this.nodes[binding.sourceNodeIndex];
					if (sourceNode) {
						node.inputRecord[inputName] = sourceNode.previousOutputs[binding.outputName] ?? 0;
					}
				} else {
					// Connection reads from current sample
					const sourceNode = this.nodes[binding.sourceNodeIndex];
					if (sourceNode) {
						node.inputRecord[inputName] = sourceNode.outputRecord[binding.outputName] ?? 0;
					}
				}
			}

			// Call the device's process function
			const result = node.process(node.inputRecord, node.config, node.state, sampleRate);

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
	collectStates(): Map<string, Record<string, unknown>> {
		const states = new Map<string, Record<string, unknown>>();
		for (const node of this.nodes) {
			states.set(node.id, node.state);
		}
		return states;
	}
}
