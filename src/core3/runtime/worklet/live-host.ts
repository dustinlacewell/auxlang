/**
 * The worklet's engine host, apart from the AudioWorklet API so it runs in
 * tests. A prepared program (prepare/host-prepared.ts) is built a budget
 * at a time after each block (wasm-host-program.ts) while the old engine
 * plays (MANIFESTO §8). When
 * the build is done, the next block starts with the swap: the new engine
 * continues the old one (state, feedback, time)
 * and an equal-power crossfade from old to new runs over 100 ms, rendering
 * both. A re-swap during a fade drops the older fading engine and fades
 * from the newer one; a stop-fading engine still counts as the old one.
 *
 * Programs build one after another, in the order they arrive: each takes
 * effect at its own block boundary (§7). A stop drops the programs still
 * building. Slot writes go to the last program posted (`writeSlots`).
 */

import type { Registry } from "../../types";
import { type MonitorRegion, setRegionFrame } from "../live/monitor-region";
import type { HostPrepared } from "../prepare/host-prepared";
import { PendingSlots } from "./pending-slots";
import { WasmHostProgram } from "./wasm-host-program";

const CROSSFADE_MS = 100;
const HALF_PI = Math.PI / 2;

/** A posted program waiting to build, with the slot writes it gets before it plays. */
interface Queued {
	readonly prepared: HostPrepared;
	readonly slots: PendingSlots;
}

export class LiveHost {
	private engine: WasmHostProgram | null = null;
	private fading: WasmHostProgram | null = null;
	private fadePos = 0;
	private readonly fadeLen: number;
	private readonly queue: Queued[] = [];
	private building: WasmHostProgram | null = null;
	private liveL = new Float32Array(128);
	private liveR = new Float32Array(128);
	private fadeL = new Float32Array(128);
	private fadeR = new Float32Array(128);

	constructor(
		sampleRate: number,
		private readonly registry: Registry,
		private readonly report: (error: unknown) => void,
	) {
		this.fadeLen = Math.max(1, Math.floor((CROSSFADE_MS / 1000) * sampleRate));
	}

	/** True while a program is queued, building, or built and waiting for the next block. */
	get pending(): boolean {
		return this.queue.length > 0 || this.building !== null;
	}

	/** Queue a program to build; it swaps in at the block boundary after its build. */
	swap(prepared: HostPrepared): void {
		this.queue.push({ prepared, slots: new PendingSlots(prepared.program.liveSlots?.length ?? 0) });
	}

	/**
	 * Slot writes, indexed by the last program posted: into it while it is
	 * queued or building (held for its swap), else into the playing engine.
	 */
	writeSlots(pairs: Float64Array): void {
		const queued = this.queue[this.queue.length - 1];
		if (queued !== undefined) queued.slots.writeSlots(pairs);
		else (this.building ?? this.engine)?.writeSlots(pairs);
	}

	/** Fade to silence instead of cutting mid-waveform; drop the programs still building. */
	stop(): void {
		this.queue.length = 0;
		this.building = null;
		if (this.engine === null) return;
		this.fading = this.engine;
		this.fadePos = 0;
		this.engine = null;
	}

	/** The live engine's monitor region; null with none (live/monitor-region.ts). */
	get monitor(): MonitorRegion | null {
		return this.engine?.monitor ?? null;
	}

	/** The live engine's program serial (prepare/wasm-prepared.ts); 0 with none. */
	get serial(): number {
		return this.engine?.wasm.serial ?? 0;
	}

	/**
	 * One block: swap in a built engine, render and mix, then spend the build
	 * budget. `frame`: the block's first sample frame, for the monitor's onsets.
	 */
	render(outL: Float32Array, outR: Float32Array, n: number, frame = 0): void {
		if (this.building?.built === true) this.swapIn(this.building);
		const region = this.monitor;
		if (region !== null) setRegionFrame(region, frame);
		this.ensureBlock(n);
		this.mix(outL, outR, n);
		this.build();
	}

	private swapIn(next: WasmHostProgram): void {
		this.building = null;
		next.swapIn();
		this.fading = this.engine ?? this.fading; // any engine already fading is dropped here
		this.fadePos = 0;
		this.engine = next;
	}

	private build(): void {
		if (this.building === null) {
			const next = this.queue.shift();
			if (next === undefined) return;
			// The program it will continue at the swap: the swap only ever takes this
			// one (or none, once a stop fade ends), since builds run one at a time.
			const source = next.prepared.continues ? (this.engine ?? this.fading) : null;
			this.building = new WasmHostProgram(next.prepared, this.registry, source, next.slots);
		}
		try {
			this.building.advance(this.building.prepared.budget);
		} catch (err) {
			this.building = null;
			this.report(err);
		}
	}

	private mix(outL: Float32Array, outR: Float32Array, n: number): void {
		const engine = this.engine;
		if (engine !== null) engine.renderBlock(this.liveL, this.liveR, 0, n);
		// The fade renders only the samples it still has; it ends mid-block.
		const fading = this.fading;
		const fadeCount = fading === null ? 0 : Math.min(n, this.fadeLen - this.fadePos);
		if (fading !== null) fading.renderBlock(this.fadeL, this.fadeR, 0, fadeCount);
		for (let i = 0; i < n; i++) {
			let l = engine === null ? 0 : (this.liveL[i] as number);
			let r = engine === null ? 0 : (this.liveR[i] as number);
			// Crossfade on swap (engine set), fade to silence on stop (engine
			// null: the gNew ramp scales the zero frame, leaving the fade-out).
			if (i < fadeCount) {
				const t = this.fadePos / this.fadeLen;
				const gNew = Math.sin(t * HALF_PI);
				const gOld = Math.cos(t * HALF_PI);
				l = l * gNew + (this.fadeL[i] as number) * gOld;
				r = r * gNew + (this.fadeR[i] as number) * gOld;
				this.fadePos++;
			}
			outL[i] = l;
			outR[i] = r;
		}
		if (fading !== null && this.fadePos >= this.fadeLen) this.fading = null;
	}

	private ensureBlock(n: number): void {
		if (this.liveL.length >= n) return;
		this.liveL = new Float32Array(n);
		this.liveR = new Float32Array(n);
		this.fadeL = new Float32Array(n);
		this.fadeR = new Float32Array(n);
	}
}
