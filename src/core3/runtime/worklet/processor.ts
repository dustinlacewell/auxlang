/**
 * AudioWorklet host: the AudioWorklet API around a LiveHost (live-host.ts),
 * which builds each prepared program while the old engine plays, swaps at a
 * block boundary and crossfades. Writes both channels; a mono destination
 * gets the l/r mixdown.
 */

import { getRegistry } from "../../module/define";
import { LiveHost } from "./live-host";
import type { WorkletMessage, WorkletReply } from "./messages";
import { QuantumMeter } from "./quantum-meter";

declare const sampleRate: number;
declare const currentFrame: number;

// Perf instrumentation is a dev-only diagnostic. `import.meta.env.DEV` is a
// build-time constant, so a production build folds every PERF branch to `false`
// and the meter is never constructed or called (zero runtime cost).
const PERF = import.meta.env.DEV;

declare class AudioWorkletProcessor {
	readonly port: MessagePort;
	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>,
	): boolean;
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

class Core3Processor extends AudioWorkletProcessor {
	private readonly host = new LiveHost(sampleRate, getRegistry(), (err) => this.reportError(err));
	// The right channel for a mono destination, mixed down after the block.
	private monoR = new Float32Array(128);
	// Opt-in render-quantum instrumentation; null until a "perf" message enables
	// it, so the hot path pays nothing by default.
	private meter: QuantumMeter | null = null;
	private meterWarm = true;

	constructor() {
		super();
		this.port.onmessage = (e: MessageEvent<WorkletMessage>) => this.handle(e.data);
	}

	private handle(message: WorkletMessage): void {
		if (message.type === "swap") this.host.swap(message.prepared);
		else if (message.type === "stop") this.host.stop();
		else if (message.type === "slots") this.host.writeSlots(message.writes);
		else if (PERF) this.setPerf(message.enabled);
	}

	private setPerf(enabled: boolean): void {
		if (enabled) {
			this.meter = new QuantumMeter();
			this.meterWarm = true; // drop the first quantum's cold-JIT time
		} else {
			this.meter = null;
		}
	}

	private reportError(err: unknown): void {
		const reply: WorkletReply = { type: "error", message: String(err) };
		this.port.postMessage(reply);
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const channels = outputs[0] as Float32Array[];
		const ch0 = channels[0] as Float32Array;
		const ch1 = channels.length > 1 ? (channels[1] as Float32Array) : null;

		const meter = this.meter;
		if (PERF && meter !== null) meter.mark(currentFrame);

		const n = ch0.length;
		if (ch1 !== null) this.host.render(ch0, ch1, n);
		else this.renderMono(ch0, n);

		if (PERF && meter !== null) {
			const report = meter.measure(this.meterWarm);
			this.meterWarm = false;
			if (report !== null) this.port.postMessage(report);
		}
		return true;
	}

	private renderMono(ch0: Float32Array, n: number): void {
		if (this.monoR.length < n) this.monoR = new Float32Array(n);
		this.host.render(ch0, this.monoR, n);
		for (let i = 0; i < n; i++) ch0[i] = 0.5 * ((ch0[i] as number) + (this.monoR[i] as number));
	}
}

registerProcessor("core3-processor", Core3Processor);
