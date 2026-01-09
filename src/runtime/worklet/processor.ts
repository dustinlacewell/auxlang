/**
 * AudioWorklet processor that runs a compiled graph.
 *
 * Supports both JS and WASM devices. WASM modules are instantiated
 * when the graph arrives and cached for reuse.
 */

import type { CompiledGraph, WorkletMessage } from "../processor/types";
import { diffGraphs } from "../processor/topology-hash";
import { RuntimeGraph } from "../processor/runtime-graph";

// AudioWorklet globals
declare const sampleRate: number;

/**
 * Instantiate a fresh WASM module from bytes.
 * Each node gets its own instance to maintain independent state.
 */
async function instantiateWasmModule(
	wasmBytes: ArrayBuffer,
): Promise<WebAssembly.Instance> {
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
 * Pre-instantiate all WASM modules in a graph.
 * Returns a map from node ID to WASM instance.
 */
async function instantiateWasmModules(
	graph: CompiledGraph,
): Promise<Map<string, WebAssembly.Instance>> {
	const instances = new Map<string, WebAssembly.Instance>();
	const wasmNodes = graph.nodes.filter((n) => n.wasmBytes);

	await Promise.all(
		wasmNodes.map(async (node) => {
			const instance = await instantiateWasmModule(node.wasmBytes as ArrayBuffer);
			instances.set(node.id, instance);
		}),
	);

	return instances;
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

	// Crossfade state
	private fadingOutGraph: RuntimeGraph | null = null;
	private fadeProgress = 1; // 1 = no fade active
	private fadeDurationSamples = 0;

	private static readonly CROSSFADE_MS = 50;

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
				break;
		}
	}

	/**
	 * Swap to a new graph, preserving state for topologically-matched nodes.
	 * Async to allow WASM instantiation before graph construction.
	 */
	private async swapGraph(newCompiledGraph: CompiledGraph): Promise<void> {
		// Instantiate fresh WASM modules for each node that needs one
		const wasmInstances = await instantiateWasmModules(newCompiledGraph);

		// Collect states from current graph
		const oldStates = this.graph?.collectStates();

		// Start crossfade if we have an existing graph
		if (this.graph) {
			this.fadingOutGraph = this.graph;
			this.fadeProgress = 0;
			this.fadeDurationSamples = Math.floor(
				(GraphProcessor.CROSSFADE_MS / 1000) * sampleRate,
			);
		}

		// Compute node mapping for state restoration
		let nodeMapping: Map<string, string> | undefined;
		if (this.oldCompiledGraph) {
			nodeMapping = diffGraphs(
				this.oldCompiledGraph.nodes,
				newCompiledGraph.nodes,
			);
		}

		// Create new optimized runtime graph with WASM instances
		this.graph = new RuntimeGraph(newCompiledGraph, wasmInstances, oldStates, nodeMapping);
		this.oldCompiledGraph = newCompiledGraph;
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

declare function registerProcessor(
	name: string,
	processorCtor: typeof AudioWorkletProcessor,
): void;

// Guard against duplicate registration during hot reload
try {
	registerProcessor("graph-processor", GraphProcessor);
} catch {
	// Already registered
}
