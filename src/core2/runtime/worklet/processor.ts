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
import { RuntimeGraph } from "./graph/runtime-graph";
import { swapGraph, type SwapResult } from "./graph/swap-graph";

declare const sampleRate: number;

// ============================================================================
// Processor
// ============================================================================

declare class AudioWorkletProcessor {
	readonly port: MessagePort;
	process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

class Core2Processor extends AudioWorkletProcessor {
	// Single graph (processes once, outputs to L/R)
	private graph: RuntimeGraph | null = null;
	private oldGraph: WorkletStereoGraph | null = null;
	private wasmInstances = new Map<string, WebAssembly.Instance>();

	// Crossfade
	private fadingOutGraph: RuntimeGraph | null = null;
	private fadeProgress = 1;
	private fadeDurationSamples = 0;
	private static readonly CROSSFADE_MS = 100;

	constructor() {
		super();
		this.port.onmessage = (e: MessageEvent<WorkletMessage>) => this.handleMessage(e.data);
	}

	private handleMessage(message: WorkletMessage): void {
		if (message.type === "setStereoGraph") {
			this.swapStereoGraph(message.stereo);
		} else if (message.type === "stop") {
			this.clearAll();
		}
	}

	private async swapStereoGraph(stereo: WorkletStereoGraph): Promise<void> {
		const result = await swapGraph(stereo, this.oldGraph, this.wasmInstances, this.graph);

		// Start crossfade from old graph
		if (result.oldGraph) {
			this.fadingOutGraph = result.oldGraph;
			this.fadeProgress = 0;
			this.fadeDurationSamples = Math.floor((Core2Processor.CROSSFADE_MS / 1000) * sampleRate);
		}

		this.graph = result.graph;
		this.oldGraph = stereo;
		this.wasmInstances = result.wasmInstances;
	}

	private clearAll(): void {
		this.graph = null;
		this.oldGraph = null;
		this.fadingOutGraph = null;
		this.fadeProgress = 1;
		this.wasmInstances.clear();
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const output = outputs[0];
		if (!output?.[0] || !this.graph) return true;

		const left = output[0];
		const right = output[1] ?? output[0];

		for (let i = 0; i < left.length; i++) {
			// Process graph once, get stereo output
			let [l, r] = this.graph.processStereoSample(sampleRate);

			// Apply crossfade if transitioning
			if (this.fadeProgress < 1) {
				[l, r] = this.applyCrossfade(l, r);
			}

			left[i] = l;
			right[i] = r;
		}

		return true;
	}

	private applyCrossfade(newLeft: number, newRight: number): [number, number] {
		const t = this.fadeProgress;
		let l = newLeft;
		let r = newRight;

		if (this.fadingOutGraph) {
			const [oldL, oldR] = this.fadingOutGraph.processStereoSample(sampleRate);
			l = oldL * (1 - t) + newLeft * t;
			r = oldR * (1 - t) + newRight * t;
		}

		this.fadeProgress += 1 / this.fadeDurationSamples;
		if (this.fadeProgress >= 1) {
			this.fadingOutGraph = null;
			this.fadeProgress = 1;
		}

		return [l, r];
	}
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

try {
	registerProcessor("core2-processor", Core2Processor);
} catch {
	// Already registered
}
