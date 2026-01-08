import type {
	CompiledGraph,
	CompiledNode,
	ConfigFn,
	PolySignal,
	SerializedSpec,
} from "./types";
import { hydrateConfig, hydrateProcess } from "./hydrate";

/**
 * Create a process function from a WASM module instance.
 *
 * WASM devices must export:
 * - init(sampleRate: number): void
 * - process(input: number): number  (mono in, mono out)
 * - set_<inputName>(value: number): void for each non-default input
 *
 * The process function wraps these exports to match the standard device interface.
 */
function hydrateWasmProcess(
	instance: WebAssembly.Instance,
	spec: SerializedSpec,
): OptimizedNode["process"] {
	const exports = instance.exports as Record<string, unknown>;

	// Get required exports
	const init = exports.init as ((sr: number) => void) | undefined;
	const processExport = exports.process as
		| ((input: number) => number)
		| undefined;

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

	let initialized = false;

	return (inputs, _config, _state, sampleRate) => {
		if (!initialized && init) {
			init(sampleRate);
			initialized = true;
		}

		// Update parameters via setters every sample (for modulation)
		for (const name of inputNames) {
			const setter = setters[name];
			if (setter) {
				const value = (inputs[name] ?? [0])[0] ?? 0;
				setter(value);
			}
		}

		// Get main input (use the device's default input)
		const inputSignal = inputs[spec.defaultInput] ?? [0];

		// Sum to mono
		let monoInput = 0;
		for (let i = 0; i < inputSignal.length; i++) {
			monoInput += inputSignal[i] ?? 0;
		}
		monoInput /= inputSignal.length || 1;

		// Process through WASM
		const output = processExport(monoInput);

		// Return mono output
		return { [spec.defaultOutput]: [output] };
	};
}

/**
 * Pre-computed binding for resolving a node input.
 * Built once at hydration, used every sample without allocation.
 */
type InputBinding =
	| { type: "constant"; value: PolySignal }
	| { type: "connection"; sourceNodeIndex: number; outputName: string };

/**
 * Optimized runtime node with pre-allocated storage.
 */
interface OptimizedNode {
	/** Original node ID (for state preservation across graph swaps) */
	id: string;

	/** The hydrated process function */
	process: (
		inputs: Record<string, PolySignal>,
		config: Record<string, ConfigFn>,
		state: Record<string, unknown>,
		sampleRate: number,
	) => Record<string, number | PolySignal>;

	/** Hydrated config functions */
	config: Record<string, ConfigFn>;

	/** Mutable state for the device */
	state: Record<string, unknown>;

	/** Default output name for final node */
	defaultOutput: string;

	/** Pre-allocated input record (mutated in place each sample) */
	inputRecord: Record<string, PolySignal>;

	/** Pre-allocated output record (mutated in place each sample) */
	outputRecord: Record<string, PolySignal>;

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
					state = JSON.parse(JSON.stringify(oldState));
				}
			}
		}

		// Get input/output names in stable order
		const inputNames = Object.keys(compiledNode.inputs).sort();
		const outputNames = [...compiledNode.spec.outputs].sort();

		// Pre-allocate input record with default values
		const inputRecord: Record<string, PolySignal> = {};
		for (const name of inputNames) {
			inputRecord[name] = [0];
		}

		// Pre-allocate output record
		const outputRecord: Record<string, PolySignal> = {};
		for (const name of outputNames) {
			outputRecord[name] = [0];
		}

		// Build input bindings
		const inputBindings: InputBinding[] = inputNames.map((name) => {
			const input = compiledNode.inputs[name];
			if (!input || input.type === "constant") {
				return { type: "constant", value: input?.value ?? [0] };
			}
			const sourceIndex = idToIndex.get(input.nodeId ?? "");
			if (sourceIndex === undefined) {
				return { type: "constant", value: [0] };
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
			inputBindings,
			inputNames,
			outputNames,
		};
	}

	/**
	 * Process one sample through the graph.
	 * Returns the summed output signal (mono sum of polyphonic channels).
	 */
	processSample(sampleRate: number): number {
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
				} else {
					const sourceNode = this.nodes[binding.sourceNodeIndex];
					if (sourceNode) {
						node.inputRecord[inputName] =
							sourceNode.outputRecord[binding.outputName] ?? [0];
					}
				}
			}

			// Call the device's process function
			const result = node.process(
				node.inputRecord,
				node.config,
				node.state,
				sampleRate,
			);

			// Copy results to pre-allocated outputRecord
			for (const outputName of node.outputNames) {
				const value = result[outputName];
				if (value !== undefined) {
					if (Array.isArray(value)) {
						node.outputRecord[outputName] = value;
					} else {
						// Normalize scalar to array - reuse existing array if possible
						const existing = node.outputRecord[outputName];
						if (existing && existing.length === 1) {
							existing[0] = value;
						} else {
							node.outputRecord[outputName] = [value];
						}
					}
				}
			}
		}

		// Get output from the output node
		const outputNode = this.nodes[this.outputNodeIndex];
		if (!outputNode) return 0;

		const outputSignal = outputNode.outputRecord[outputNode.defaultOutput];
		if (!outputSignal) return 0;

		// Sum polyphonic channels to mono
		let sum = 0;
		for (let i = 0; i < outputSignal.length; i++) {
			sum += outputSignal[i] ?? 0;
		}
		return sum;
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
