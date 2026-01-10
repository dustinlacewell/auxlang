/**
 * AudioWorklet processor that runs a compiled graph.
 *
 * Supports both JS and WASM devices. WASM modules are instantiated
 * when the graph arrives and cached for reuse.
 */

import { RuntimeGraph } from "../processor/runtime-graph";
import { diffGraphs } from "../processor/topology-hash";
import type { CompiledGraph, WorkletMessage } from "../processor/types";

// AudioWorklet globals
declare const sampleRate: number;

/**
 * Instantiate a fresh WASM module from bytes.
 * Each node gets its own instance to maintain independent state.
 */
async function instantiateWasmModule(wasmBytes: ArrayBuffer): Promise<WebAssembly.Instance> {
	const wasmModule = await WebAssembly.instantiate(wasmBytes, {
		env: {
			abort: () => {
				console.error("WASM abort called");
			},
		},
	});
	return wasmModule.instance;
}

/**
 * Serialize state from a WASM instance (if it supports serialization).
 * Returns Float32Array of state data, or null if not supported.
 */
function serializeWasmState(instance: WebAssembly.Instance): Float32Array | null {
	const exports = instance.exports as Record<string, unknown>;
	const getStateSize = exports.get_state_size as (() => number) | undefined;
	const allocStateBuffer = exports.alloc_state_buffer as ((size: number) => number) | undefined;
	const serializeState = exports.serialize_state as (() => number) | undefined;
	const memory = exports.memory as WebAssembly.Memory | undefined;

	if (!getStateSize || !allocStateBuffer || !serializeState || !memory) {
		return null;
	}

	const size = getStateSize();
	if (size <= 0) return null;

	const ptr = allocStateBuffer(size);
	const written = serializeState();
	if (written <= 0) return null;

	// Copy from WASM memory to JS
	const wasmBuffer = new Float32Array(memory.buffer, ptr, written);
	return new Float32Array(wasmBuffer); // Make a copy
}

/**
 * Deserialize state into a WASM instance (if it supports serialization).
 */
function deserializeWasmState(instance: WebAssembly.Instance, state: Float32Array): void {
	const exports = instance.exports as Record<string, unknown>;
	const allocStateBuffer = exports.alloc_state_buffer as ((size: number) => number) | undefined;
	const deserializeState = exports.deserialize_state as (() => void) | undefined;
	const memory = exports.memory as WebAssembly.Memory | undefined;

	if (!allocStateBuffer || !deserializeState || !memory) {
		return;
	}

	const ptr = allocStateBuffer(state.length);
	// Copy from JS to WASM memory
	const wasmBuffer = new Float32Array(memory.buffer, ptr, state.length);
	wasmBuffer.set(state);
	deserializeState();
}


declare class AudioWorkletProcessor {
	readonly port: MessagePort;
	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>,
	): boolean;
}

export class GraphProcessor extends AudioWorkletProcessor {
	private graph: RuntimeGraph | null = null;
	private oldCompiledGraph: CompiledGraph | null = null;

	// WASM instances from current graph, keyed by node ID
	// Used to serialize state before creating new instances
	private wasmInstances = new Map<string, WebAssembly.Instance>();

	// Crossfade state
	private fadingOutGraph: RuntimeGraph | null = null;
	private fadeProgress = 1; // 1 = no fade active
	private fadeDurationSamples = 0;

	private static readonly CROSSFADE_MS = 0;

	constructor() {
		super();
		this.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
			this.handleMessage(event.data);
		};
	}

	private handleMessage(message: WorkletMessage): void {
		switch (message.type) {
			case "setGraph":
				this.swapGraph(message.graph);
				break;
			case "stop":
				this.graph = null;
				this.oldCompiledGraph = null;
				this.fadingOutGraph = null;
				this.fadeProgress = 1;
				this.wasmInstances.clear();
				break;
		}
	}

	/**
	 * Swap to a new graph, preserving state for topologically-matched nodes.
	 * WASM state is serialized from old instances and deserialized into new ones.
	 */
	private async swapGraph(newCompiledGraph: CompiledGraph): Promise<void> {
		// Compute node mapping to know which nodes match between old and new graphs
		let nodeMapping: Map<string, string> | undefined;
		if (this.oldCompiledGraph) {
			nodeMapping = diffGraphs(this.oldCompiledGraph.nodes, newCompiledGraph.nodes);
		}

		// Serialize WASM state from old instances BEFORE creating new ones
		// Map: new node ID → serialized state
		const wasmStates = new Map<string, Float32Array>();
		if (nodeMapping) {
			for (const [newNodeId, oldNodeId] of nodeMapping) {
				const oldInstance = this.wasmInstances.get(oldNodeId);
				if (oldInstance) {
					const state = serializeWasmState(oldInstance);
					if (state) {
						wasmStates.set(newNodeId, state);
					}
				}
			}
		}

		// Create fresh WASM instances for all WASM nodes
		const newWasmInstances = new Map<string, WebAssembly.Instance>();
		const wasmNodes = newCompiledGraph.nodes.filter((n) => n.wasmBytes);

		await Promise.all(
			wasmNodes.map(async (node) => {
				const instance = await instantiateWasmModule(node.wasmBytes as ArrayBuffer);
				newWasmInstances.set(node.id, instance);
			}),
		);

		// Initialize new WASM instances and restore state
		for (const [nodeId, instance] of newWasmInstances) {
			const exports = instance.exports as Record<string, unknown>;
			const init = exports.init as ((sr: number) => void) | undefined;
			if (init) {
				init(sampleRate);
			}

			// Restore state if we have it from matched old node
			const savedState = wasmStates.get(nodeId);
			if (savedState) {
				deserializeWasmState(instance, savedState);
			}
		}

		// Collect JS device states from current graph
		const oldStates = this.graph?.collectStates();

		// Start crossfade if we have an existing graph
		if (this.graph) {
			this.fadingOutGraph = this.graph;
			this.fadeProgress = 0;
			this.fadeDurationSamples = Math.floor((GraphProcessor.CROSSFADE_MS / 1000) * sampleRate);
		}

		// Create new runtime graph with fresh WASM instances
		this.graph = new RuntimeGraph(newCompiledGraph, newWasmInstances, oldStates, nodeMapping);
		this.oldCompiledGraph = newCompiledGraph;

		// Store new WASM instances for next swap
		this.wasmInstances = newWasmInstances;
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const output = outputs[0];
		if (!output?.[0] || !this.graph) {
			return true;
		}

		const channel = output[0];
		const blockSize = channel.length;

		for (let i = 0; i < blockSize; i++) {
			const newSample = this.graph.processSample(sampleRate);

			// Handle crossfade if active
			if (this.fadeProgress < 1 && this.fadingOutGraph) {
				const oldSample = this.fadingOutGraph.processSample(sampleRate);
				const t = this.fadeProgress;
				channel[i] = oldSample * (1 - t) + newSample * t;

				this.fadeProgress += 1 / this.fadeDurationSamples;
				if (this.fadeProgress >= 1) {
					this.fadingOutGraph = null;
					this.fadeProgress = 1;
				}
			} else {
				channel[i] = newSample;
			}
		}

		// Copy to other channels if stereo
		for (let ch = 1; ch < output.length; ch++) {
			output[ch]?.set(channel);
		}

		return true;
	}
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

// Guard against duplicate registration during hot reload
try {
	registerProcessor("graph-processor", GraphProcessor);
} catch {
	// Already registered
}
