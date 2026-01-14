/**
 * Core2 AudioWorklet processor with seamless re-evaluation.
 *
 * On graph swap:
 * 1. Match nodes by topology (device type + connections)
 * 2. Preserve state: JS device state, lambda state, WASM buffers
 * 3. Crossfade between old and new graphs
 *
 * Stereo processing:
 * - Single graph processed once per sample
 * - Outputs routed to L/R channels by output ID
 */

import type { WorkletMessage, WorkletStereoGraph } from "../worklet-types";
import type { RuntimeGraph } from "./graph/runtime-graph";
import { swapGraph } from "./graph/swap-graph";
import type { NodeMetrics, SequencerMetrics } from "./graph/visualization-metrics";

declare const sampleRate: number;

// ============================================================================
// Processor
// ============================================================================

declare class AudioWorkletProcessor {
	readonly port: MessagePort;
	process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

class Core2Processor extends AudioWorkletProcessor {
	private graphs = new Map<string, RuntimeGraph>();
	private oldGraphs = new Map<string, WorkletStereoGraph>();
	private wasmInstances = new Map<string, WebAssembly.Instance>();

	private fadingGraphs = new Map<string, {
		graph: RuntimeGraph;
		fadeProgress: number;
		fadeDurationSamples: number;
	}>();
	private static readonly CROSSFADE_MS = 100;

	constructor() {
		super();
		this.port.onmessage = (e: MessageEvent<WorkletMessage>) => this.handleMessage(e.data);
	}

	private handleMessage(message: WorkletMessage): void {
		if (message.type === "setStereoGraph") {
			this.swapStereoGraph(message.stereo, message.graphId);
		} else if (message.type === "stop") {
			if (message.graphId) {
				this.stopGraph(message.graphId);
			} else {
				this.clearAll();
			}
		}
	}

	private async swapStereoGraph(stereo: WorkletStereoGraph, graphId: string): Promise<void> {
		const oldGraph = this.oldGraphs.get(graphId) || null;
		const currentGraph = this.graphs.get(graphId) || null;
		const result = await swapGraph(stereo, oldGraph, this.wasmInstances, currentGraph);

		if (result.oldGraph) {
			this.fadingGraphs.set(graphId, {
				graph: result.oldGraph,
				fadeProgress: 0,
				fadeDurationSamples: Math.floor((Core2Processor.CROSSFADE_MS / 1000) * sampleRate),
			});
		}

		// Set up decoration callback for this graph
		result.graph.setDecorationCallback((nodeId, decorations) => {
			this.emitDecorations(graphId, nodeId, decorations);
		});

		this.graphs.set(graphId, result.graph);
		this.oldGraphs.set(graphId, stereo);
		this.wasmInstances = result.wasmInstances;
	}

	private stopGraph(graphId: string): void {
		this.graphs.delete(graphId);
		this.oldGraphs.delete(graphId);
		this.fadingGraphs.delete(graphId);
	}

	private clearAll(): void {
		this.graphs.clear();
		this.oldGraphs.clear();
		this.fadingGraphs.clear();
		this.wasmInstances.clear();
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const output = outputs[0];
		if (!output?.[0]) return true;

		const left = output[0];
		const right = output[1] ?? output[0];

		for (let i = 0; i < left.length; i++) {
			let l = 0;
			let r = 0;

			for (const [graphId, graph] of this.graphs) {
				let [gl, gr] = graph.processStereoSample(sampleRate);

				const fading = this.fadingGraphs.get(graphId);
				if (fading) {
					[gl, gr] = this.applyCrossfade(gl, gr, fading);
					
					// Clean up fading graph when crossfade completes
					if (fading.fadeProgress >= 1.0) {
						this.fadingGraphs.delete(graphId);
					}
				}

				l += gl;
				r += gr;
			}

			left[i] = l;
			right[i] = r;
		}

		for (const [graphId, graph] of this.graphs) {
			const metrics = graph.collectVisualizationMetrics();
			if (metrics) {
				this.emitVisualizationMetrics(graphId, metrics);
			}
		}

		return true;
	}

	private applyCrossfade(
		newLeft: number,
		newRight: number,
		fading: { graph: RuntimeGraph; fadeProgress: number; fadeDurationSamples: number }
	): [number, number] {
		const t = fading.fadeProgress;
		const [oldL, oldR] = fading.graph.processStereoSample(sampleRate);
		const l = oldL * (1 - t) + newLeft * t;
		const r = oldR * (1 - t) + newRight * t;

		fading.fadeProgress += 1 / fading.fadeDurationSamples;

		return [l, r];
	}

	private emitVisualizationMetrics(
		graphId: string,
		data: { audio: Map<string, NodeMetrics>; sequencers: Map<string, SequencerMetrics> }
	): void {
		const audioObj: Record<string, NodeMetrics> = {};
		for (const [id, metric] of data.audio) {
			audioObj[id] = metric;
		}

		const seqObj: Record<string, SequencerMetrics> = {};
		for (const [id, metric] of data.sequencers) {
			seqObj[id] = metric;
		}

		this.port.postMessage({
			type: "visualization",
			graphId,
			audio: audioObj,
			sequencers: seqObj,
		});
	}

	private emitDecorations(graphId: string, nodeId: string, decorations: Array<{ start: number; end: number }>): void {
		this.port.postMessage({
			type: "decorations",
			graphId,
			nodeId,
			decorations,
		});
	}
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

try {
	registerProcessor("core2-processor", Core2Processor);
} catch {
	// Already registered
}
