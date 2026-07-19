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
import { Core3Engine } from "../engine";
import { withProgramSpecs } from "../hydrate-specs";
import type { WorkletMessage, WorkletReply } from "./messages";

declare const sampleRate: number;

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

class Core3Processor extends AudioWorkletProcessor {
	private engine: Core3Engine | null = null;
	private fading: Core3Engine | null = null;
	private fadePos = 0;
	private readonly fadeLen = Math.max(1, Math.floor((CROSSFADE_MS / 1000) * sampleRate));
	private readonly frame = new Float32Array(2);
	private readonly fadeFrame = new Float32Array(2);

	constructor() {
		super();
		this.port.onmessage = (e: MessageEvent<WorkletMessage>) => this.handle(e.data);
	}

	private handle(message: WorkletMessage): void {
		if (message.type === "swap") this.swap(message.program);
		else if (message.type === "stop") {
			// Fade to silence instead of cutting mid-waveform: the live engine
			// becomes the fading engine with no successor.
			if (this.engine !== null) {
				this.fading = this.engine;
				this.fadePos = 0;
				this.engine = null;
			}
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
				this.engine = new Core3Engine(program, sampleRate, registry);
				this.fading = null;
				return;
			}
			const next = new Core3Engine(program, sampleRate, registry, prev.collectState());
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

		for (let i = 0; i < ch0.length; i++) {
			let l = 0;
			let r = 0;
			const engine = this.engine;
			if (engine !== null) {
				engine.tick(this.frame);
				l = this.frame[0] as number;
				r = this.frame[1] as number;
			}
			// The fade runs with or without a successor engine: crossfade on
			// swap (engine set), fade to silence on stop (engine null — the
			// gNew ramp scales the zero frame, leaving just the fade-out).
			const fading = this.fading;
			if (fading !== null) {
				fading.tick(this.fadeFrame);
				const t = this.fadePos / this.fadeLen;
				const gNew = Math.sin(t * HALF_PI);
				const gOld = Math.cos(t * HALF_PI);
				l = l * gNew + (this.fadeFrame[0] as number) * gOld;
				r = r * gNew + (this.fadeFrame[1] as number) * gOld;
				this.fadePos++;
				if (this.fadePos >= this.fadeLen) this.fading = null;
			}
			if (ch1 !== null) {
				ch0[i] = l;
				ch1[i] = r;
			} else {
				ch0[i] = 0.5 * (l + r);
			}
		}
		return true;
	}
}

registerProcessor("core3-processor", Core3Processor);
