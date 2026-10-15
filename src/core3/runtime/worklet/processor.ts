/**
 * AudioWorklet host: wraps the same Core3Engine the offline renderer uses.
 * A "swap" builds a new engine seeded from the running engine's collectState()
 * (state migration + continuous time), then equal-power crossfades old -> new
 * over 100 ms, ticking both. A re-swap during a fade drops the older fading
 * engine and fades from the newer one. Writes both channels; a mono
 * destination gets the l/r mixdown.
 */

import { getRegistry } from "../../module/define";
import type { Program } from "../../types";
import { Core3Engine, type EngineOptions } from "../engine";
import { withProgramSpecs } from "../hydrate-specs";
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

const CROSSFADE_MS = 100;
const HALF_PI = Math.PI / 2;
// The worklet runs the generated per-program driver; the engine falls back to
// the interpreter (logged) if the host forbids `new Function`.
const ENGINE_OPTIONS: EngineOptions = { codegen: true };

class Core3Processor extends AudioWorkletProcessor {
	private engine: Core3Engine | null = null;
	private fading: Core3Engine | null = null;
	private fadePos = 0;
	private readonly fadeLen = Math.max(1, Math.floor((CROSSFADE_MS / 1000) * sampleRate));
	// Block buffers for the live and fading engines, sized to the render
	// quantum (128); regrown only if a host hands a longer quantum.
	private liveL = new Float32Array(128);
	private liveR = new Float32Array(128);
	private fadeL = new Float32Array(128);
	private fadeR = new Float32Array(128);
	// Opt-in render-quantum instrumentation; null until a "perf" message enables
	// it, so the hot path pays nothing by default.
	private meter: QuantumMeter | null = null;
	private meterWarm = true;

	constructor() {
		super();
		this.port.onmessage = (e: MessageEvent<WorkletMessage>) => this.handle(e.data);
	}

	private handle(message: WorkletMessage): void {
		if (message.type === "swap") this.swap(message.program);
		else if (message.type === "perf") {
			if (PERF) this.setPerf(message.enabled);
		} else if (message.type === "stop") {
			// Fade to silence instead of cutting mid-waveform: the live engine
			// becomes the fading engine with no successor.
			if (this.engine !== null) {
				this.fading = this.engine;
				this.fadePos = 0;
				this.engine = null;
			}
		}
	}

	private setPerf(enabled: boolean): void {
		if (enabled) {
			this.meter = new QuantumMeter();
			this.meterWarm = true; // drop the first quantum's cold-JIT time
		} else {
			this.meter = null;
		}
	}

	private swap(program: Program): void {
		try {
			// Patch-defined specs hydrate into a per-engine layered map; the global
			// registry is never written, so two crossfading engines can safely
			// carry different same-named specs.
			const registry = withProgramSpecs(getRegistry(), program);
			// A stop-fading engine still counts as "previous": a quick re-run
			// migrates its state and crossfades from it.
			const prev = this.engine ?? this.fading;
			if (prev === null) {
				this.engine = new Core3Engine(program, sampleRate, registry, undefined, ENGINE_OPTIONS);
				this.fading = null;
				return;
			}
			const next = new Core3Engine(
				program,
				sampleRate,
				registry,
				prev.collectState(),
				ENGINE_OPTIONS,
			);
			this.fading = prev; // any engine already fading is dropped here
			this.fadePos = 0;
			this.engine = next;
		} catch (err) {
			const reply: WorkletReply = { type: "error", message: String(err) };
			this.port.postMessage(reply);
		}
	}

	process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const channels = outputs[0] as Float32Array[];
		const ch0 = channels[0] as Float32Array;
		const ch1 = channels.length > 1 ? (channels[1] as Float32Array) : null;

		const meter = this.meter;
		if (PERF && meter !== null) meter.mark(currentFrame);

		const n = ch0.length;
		this.ensureBlock(n);
		const engine = this.engine;
		if (engine !== null) engine.renderBlock(this.liveL, this.liveR, 0, n);
		// The fade renders only the samples it still has; it ends mid-block.
		const fading = this.fading;
		const fadeCount = fading === null ? 0 : Math.min(n, this.fadeLen - this.fadePos);
		if (fading !== null) fading.renderBlock(this.fadeL, this.fadeR, 0, fadeCount);

		for (let i = 0; i < n; i++) {
			let l = 0;
			let r = 0;
			if (engine !== null) {
				l = this.liveL[i] as number;
				r = this.liveR[i] as number;
			}
			// The fade runs with or without a successor engine: crossfade on
			// swap (engine set), fade to silence on stop (engine null — the
			// gNew ramp scales the zero frame, leaving just the fade-out).
			if (i < fadeCount) {
				const t = this.fadePos / this.fadeLen;
				const gNew = Math.sin(t * HALF_PI);
				const gOld = Math.cos(t * HALF_PI);
				l = l * gNew + (this.fadeL[i] as number) * gOld;
				r = r * gNew + (this.fadeR[i] as number) * gOld;
				this.fadePos++;
			}
			if (ch1 !== null) {
				ch0[i] = l;
				ch1[i] = r;
			} else {
				ch0[i] = 0.5 * (l + r);
			}
		}
		if (fading !== null && this.fadePos >= this.fadeLen) this.fading = null;

		if (PERF && meter !== null) {
			const report = meter.measure(this.meterWarm);
			this.meterWarm = false;
			if (report !== null) this.port.postMessage(report);
		}
		return true;
	}

	private ensureBlock(n: number): void {
		if (this.liveL.length >= n) return;
		this.liveL = new Float32Array(n);
		this.liveR = new Float32Array(n);
		this.fadeL = new Float32Array(n);
		this.fadeR = new Float32Array(n);
	}
}

registerProcessor("core3-processor", Core3Processor);
