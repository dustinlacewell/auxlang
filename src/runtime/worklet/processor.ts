/**
 * AudioWorklet processor that runs a compiled graph.
 *
 * Supports both JS and WASM devices. WASM modules are instantiated
 * when the graph arrives and cached for reuse.
 */

import { RuntimeGraph, type CollectedStates } from "../processor/runtime-graph";
import { diffGraphs } from "../processor/topology-hash";
import type { CompiledGraph, CompiledStereoGraph, WorkletMessage } from "../processor/types";

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
	// Stereo graphs - left and right channels
	private leftGraph: RuntimeGraph | null = null;
	private rightGraph: RuntimeGraph | null = null;
	private oldLeftCompiledGraph: CompiledGraph | null = null;
	private oldRightCompiledGraph: CompiledGraph | null = null;

	// WASM instances from current graphs, keyed by node ID
	// Used to serialize state before creating new instances
	private leftWasmInstances = new Map<string, WebAssembly.Instance>();
	private rightWasmInstances = new Map<string, WebAssembly.Instance>();

	// Crossfade state
	private fadingOutLeftGraph: RuntimeGraph | null = null;
	private fadingOutRightGraph: RuntimeGraph | null = null;
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
				// Legacy mono - treat as stereo with same graph for both channels
				this.swapStereoGraph({ left: message.graph, right: message.graph });
				break;
			case "setStereoGraph":
				this.swapStereoGraph(message.stereo);
				break;
			case "stop":
				this.leftGraph = null;
				this.rightGraph = null;
				this.oldLeftCompiledGraph = null;
				this.oldRightCompiledGraph = null;
				this.fadingOutLeftGraph = null;
				this.fadingOutRightGraph = null;
				this.fadeProgress = 1;
				this.leftWasmInstances.clear();
				this.rightWasmInstances.clear();
				break;
		}
	}

	/**
	 * Swap to stereo graphs, preserving state for topologically-matched nodes.
	 * WASM state is serialized from old instances and deserialized into new ones.
	 */
	private async swapStereoGraph(stereo: CompiledStereoGraph): Promise<void> {
		// Swap left channel
		const leftResult = await this.swapSingleGraph(
			stereo.left,
			this.oldLeftCompiledGraph,
			this.leftWasmInstances,
			this.leftGraph,
		);
		this.leftGraph = leftResult.graph;
		this.oldLeftCompiledGraph = stereo.left;
		this.leftWasmInstances = leftResult.wasmInstances;

		// Swap right channel
		const rightResult = await this.swapSingleGraph(
			stereo.right,
			this.oldRightCompiledGraph,
			this.rightWasmInstances,
			this.rightGraph,
		);
		this.rightGraph = rightResult.graph;
		this.oldRightCompiledGraph = stereo.right;
		this.rightWasmInstances = rightResult.wasmInstances;

		// Setup crossfade if we had existing graphs
		if (leftResult.oldGraph || rightResult.oldGraph) {
			this.fadingOutLeftGraph = leftResult.oldGraph;
			this.fadingOutRightGraph = rightResult.oldGraph;
			this.fadeProgress = 0;
			this.fadeDurationSamples = Math.floor((GraphProcessor.CROSSFADE_MS / 1000) * sampleRate);
		}
	}

	/**
	 * Swap a single graph channel, returning the new graph and WASM instances.
	 */
	private async swapSingleGraph(
		newCompiledGraph: CompiledGraph,
		oldCompiledGraph: CompiledGraph | null,
		oldWasmInstances: Map<string, WebAssembly.Instance>,
		oldGraph: RuntimeGraph | null,
	): Promise<{
		graph: RuntimeGraph;
		wasmInstances: Map<string, WebAssembly.Instance>;
		oldGraph: RuntimeGraph | null;
	}> {
		// Compute node mapping to know which nodes match between old and new graphs
		let nodeMapping: Map<string, string> | undefined;
		if (oldCompiledGraph) {
			nodeMapping = diffGraphs(oldCompiledGraph.nodes, newCompiledGraph.nodes);
		}

		// Serialize WASM state from old instances BEFORE creating new ones
		const wasmStates = new Map<string, Float32Array>();
		if (nodeMapping) {
			for (const [newNodeId, oldNodeId] of nodeMapping) {
				const oldInstance = oldWasmInstances.get(oldNodeId);
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

			const savedState = wasmStates.get(nodeId);
			if (savedState) {
				deserializeWasmState(instance, savedState);
			}
		}

		// Collect JS device states from current graph
		const oldStates = oldGraph?.collectStates();

		// Create new runtime graph with fresh WASM instances
		const graph = new RuntimeGraph(newCompiledGraph, newWasmInstances, oldStates, nodeMapping);

		return {
			graph,
			wasmInstances: newWasmInstances,
			oldGraph,
		};
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const output = outputs[0];
		if (!output?.[0] || !this.leftGraph || !this.rightGraph) {
			return true;
		}

		const leftChannel = output[0];
		const rightChannel = output[1] ?? output[0]; // Fallback to mono if no right channel
		const blockSize = leftChannel.length;

		for (let i = 0; i < blockSize; i++) {
			let leftSample = this.leftGraph.processSample(sampleRate);
			let rightSample = this.rightGraph.processSample(sampleRate);

			// Handle crossfade if active
			if (this.fadeProgress < 1) {
				if (this.fadingOutLeftGraph) {
					const oldLeft = this.fadingOutLeftGraph.processSample(sampleRate);
					const t = this.fadeProgress;
					leftSample = oldLeft * (1 - t) + leftSample * t;
				}
				if (this.fadingOutRightGraph) {
					const oldRight = this.fadingOutRightGraph.processSample(sampleRate);
					const t = this.fadeProgress;
					rightSample = oldRight * (1 - t) + rightSample * t;
				}

				this.fadeProgress += 1 / this.fadeDurationSamples;
				if (this.fadeProgress >= 1) {
					this.fadingOutLeftGraph = null;
					this.fadingOutRightGraph = null;
					this.fadeProgress = 1;
				}
			}

			leftChannel[i] = leftSample;
			rightChannel[i] = rightSample;
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
