import type { CompiledGraph, PolySignal, RuntimeNode, WorkletMessage } from "./types";
import { diffGraphs } from "./topology-hash";
import { hydrateGraph } from "./hydrate";

// AudioWorklet globals
declare const sampleRate: number;
declare class AudioWorkletProcessor {
	readonly port: MessagePort;
	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>,
	): boolean;
}

/**
 * AudioWorklet processor that runs a compiled graph.
 *
 * All signals are polyphonic (number[]). Devices receive poly inputs
 * and return poly outputs. The runtime normalizes scalar returns to [scalar].
 * Devices handle their own polyphony logic internally.
 *
 * Supports live re-evaluation: when a new graph is sent, nodes with the same
 * topological position (device type + connection structure) preserve their state.
 * Individual devices handle their own transition timing (e.g., seq waits for
 * next beat before applying pattern changes).
 */
export class GraphProcessor extends AudioWorkletProcessor {
	private nodes: RuntimeNode[] = [];
	private nodeOutputs: Map<string, Record<string, PolySignal>> = new Map();
	private outputNodeId: string | null = null;

	// For live re-evaluation: keep old graph info for diffing
	private oldGraph: CompiledGraph | null = null;

	// Crossfade state: old graph fades out while new graph fades in
	private fadingOutNodes: RuntimeNode[] = [];
	private fadingOutOutputs: Map<string, Record<string, PolySignal>> = new Map();
	private fadingOutOutputNodeId: string | null = null;
	private fadeProgress = 0; // 0 = start of fade, 1 = fade complete
	private fadeDurationSamples = 0;

	// Crossfade duration in milliseconds
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
				if (message.graph) {
					this.swapGraph(message.graph);
				}
				break;
			case "stop":
				this.nodes = [];
				this.outputNodeId = null;
				this.nodeOutputs.clear();
				this.oldGraph = null;
				this.fadingOutNodes = [];
				this.fadingOutOutputs.clear();
				this.fadingOutOutputNodeId = null;
				this.fadeProgress = 1;
				break;
		}
	}

	/**
	 * Swap to a new graph, preserving state for topologically-matched nodes.
	 * Starts a crossfade from old graph to new graph.
	 */
	private swapGraph(newGraph: CompiledGraph): void {
		// Collect current node states before swapping
		const oldStates = new Map<string, Record<string, unknown>>();
		for (const node of this.nodes) {
			oldStates.set(node.id, node.state);
		}

		// Move current graph to fading-out position (if there is one)
		if (this.nodes.length > 0) {
			this.fadingOutNodes = this.nodes;
			this.fadingOutOutputs = this.nodeOutputs;
			this.fadingOutOutputNodeId = this.outputNodeId;
			this.fadeProgress = 0;
			this.fadeDurationSamples = Math.floor((GraphProcessor.CROSSFADE_MS / 1000) * sampleRate);
		}

		// Compute node mapping if we have an old graph
		let nodeMapping: Map<string, string> | undefined;
		if (this.oldGraph) {
			nodeMapping = diffGraphs(this.oldGraph.nodes, newGraph.nodes);
		}

		// Hydrate new graph with state restoration
		this.nodes = hydrateGraph(newGraph, oldStates, nodeMapping);
		this.outputNodeId = newGraph.outputNodeId;
		this.nodeOutputs = new Map();

		// Store for next swap
		this.oldGraph = newGraph;
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const output = outputs[0];
		if (!output || !output[0] || this.nodes.length === 0 || !this.outputNodeId) {
			return true;
		}

		const channel = output[0];
		const blockSize = channel.length;

		for (let i = 0; i < blockSize; i++) {
			// Process new (main) graph
			for (const node of this.nodes) {
				const nodeOutput = this.processNode(node, this.nodeOutputs);
				this.nodeOutputs.set(node.id, nodeOutput);
			}

			// Get new graph output
			let newSample = 0;
			const finalOutputs = this.nodeOutputs.get(this.outputNodeId);
			const outputNode = this.nodes.find((n) => n.id === this.outputNodeId);
			if (finalOutputs && outputNode) {
				const polySample = finalOutputs[outputNode.defaultOutput] ?? [0];
				newSample = polySample.reduce((a, b) => a + b, 0);
			}

			// Process fading-out graph if active
			let oldSample = 0;
			if (this.fadeProgress < 1 && this.fadingOutNodes.length > 0 && this.fadingOutOutputNodeId) {
				for (const node of this.fadingOutNodes) {
					const nodeOutput = this.processNode(node, this.fadingOutOutputs);
					this.fadingOutOutputs.set(node.id, nodeOutput);
				}

				const oldFinalOutputs = this.fadingOutOutputs.get(this.fadingOutOutputNodeId);
				const oldOutputNode = this.fadingOutNodes.find((n) => n.id === this.fadingOutOutputNodeId);
				if (oldFinalOutputs && oldOutputNode) {
					const polySample = oldFinalOutputs[oldOutputNode.defaultOutput] ?? [0];
					oldSample = polySample.reduce((a, b) => a + b, 0);
				}
			}

			// Crossfade: linear crossfade
			if (this.fadeProgress < 1) {
				const t = this.fadeProgress;
				const oldGain = 1 - t;
				const newGain = t;
				channel[i] = oldSample * oldGain + newSample * newGain;

				// Advance fade
				this.fadeProgress += 1 / this.fadeDurationSamples;
				if (this.fadeProgress >= 1) {
					// Fade complete - clear fading-out graph
					this.fadingOutNodes = [];
					this.fadingOutOutputs.clear();
					this.fadingOutOutputNodeId = null;
					this.fadeProgress = 1;
				}
			} else {
				channel[i] = newSample;
			}
		}

		// Copy to other channels if stereo
		for (let ch = 1; ch < output.length; ch++) {
			const dest = output[ch];
			if (dest) {
				dest.set(channel);
			}
		}

		return true;
	}

	/**
	 * Process a node: resolve inputs, call process once, normalize outputs.
	 */
	private processNode(
		node: RuntimeNode,
		outputsMap: Map<string, Record<string, PolySignal>>,
	): Record<string, PolySignal> {
		// Resolve inputs to poly signals
		const polyInputs = this.resolvePolyInputs(node, outputsMap);

		// Call process once with poly inputs
		const output = node.process(polyInputs, node.config, node.state, sampleRate);

		// Normalize outputs: wrap scalars in arrays
		const polyOutputs: Record<string, PolySignal> = {};
		for (const [name, value] of Object.entries(output)) {
			if (Array.isArray(value)) {
				polyOutputs[name] = value;
			} else {
				polyOutputs[name] = [value];
			}
		}

		return polyOutputs;
	}

	/**
	 * Resolve node inputs to polyphonic signals.
	 */
	private resolvePolyInputs(
		node: RuntimeNode,
		outputsMap: Map<string, Record<string, PolySignal>>,
	): Record<string, PolySignal> {
		const resolved: Record<string, PolySignal> = {};

		for (const [name, input] of Object.entries(node.inputs)) {
			if (input.type === "constant") {
				resolved[name] = input.value ?? [0];
			} else if (input.nodeId && input.output) {
				const sourceOutputs = outputsMap.get(input.nodeId);
				resolved[name] = sourceOutputs?.[input.output] ?? [0];
			} else {
				resolved[name] = [0];
			}
		}

		return resolved;
	}
}

declare function registerProcessor(
	name: string,
	processorCtor: typeof AudioWorkletProcessor,
): void;

registerProcessor("graph-processor", GraphProcessor);
