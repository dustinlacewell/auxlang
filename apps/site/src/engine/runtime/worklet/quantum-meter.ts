/**
 * Render-quantum timing instrument for the audio worklet. Measures how long
 * each process() call takes and flags quanta that blow the deadline budget
 * (~2.67 ms at 48 kHz / 128 frames) — the signature of the crackle.
 *
 * Discipline: everything is preallocated in the constructor. mark()/measure()
 * touch only primitives and preexisting typed-array slots, so the meter never
 * allocates on the audio thread — it must not cause the disease it measures.
 * Quantum 0 (first call after a swap warms every buffer/JIT path) is dropped
 * from stats. Reporting is polled by quantum count, not a timer.
 */

import type { PerfClock, PerfOverrun, PerfReport } from "./messages";

const WINDOW_QUANTA = 375; // ~1 s of reporting at 48 kHz / 128 frames
const RING = 2048; // recent quantum times kept for p99
const MAX_OVERRUNS = 64; // overruns retained per window (older ones dropped)

// AudioWorkletGlobalScope exposes performance.now() in most Chromium builds but
// NOT all (headless / non-cross-origin-isolated can lack it). Date.now() is
// always present; at 1 ms resolution it still catches the multi-ms GC stalls
// that cause crackle, just not sub-ms jitter. Pick the best available and tell
// the reader which, so a wall of zeros can't be mistaken for "no overruns".
declare const performance: { now(): number } | undefined;

function pickClock(): { clock: PerfClock; now: () => number } {
	if (typeof performance !== "undefined" && typeof performance.now === "function") {
		const p = performance;
		return { clock: "performance.now", now: () => p.now() };
	}
	if (typeof Date !== "undefined" && typeof Date.now === "function") {
		return { clock: "Date.now", now: () => Date.now() };
	}
	return { clock: "none", now: () => 0 };
}

export class QuantumMeter {
	private readonly times = new Float32Array(RING);
	private readonly sorted = new Float32Array(RING);
	private readonly overrunElapsed = new Float32Array(MAX_OVERRUNS);
	private readonly overrunFrame = new Float64Array(MAX_OVERRUNS);
	private readonly clockSrc = pickClock();

	private count = 0; // quanta since window start (post warm-up)
	private ringFill = 0; // valid entries in the ring (<= RING)
	private ringPos = 0;
	private overrunCount = 0;
	private sum = 0;
	private max = 0;
	private t0 = 0;
	private startFrame = 0;

	constructor(private readonly budgetMs = 2.0) {}

	/** Call at the top of process(); records the quantum's start time + frame. */
	mark(frame: number): void {
		this.startFrame = frame;
		this.t0 = this.clockSrc.now();
	}

	/**
	 * Call at the bottom of process(). Returns a report once per window,
	 * else null. `warm` is true on the very first quantum after a (re)start so
	 * its cold-JIT time is excluded.
	 */
	measure(warm: boolean): PerfReport | null {
		const elapsed = this.clockSrc.now() - this.t0;
		if (warm) return null;
		this.record(elapsed);
		return this.count >= WINDOW_QUANTA ? this.flush() : null;
	}

	private record(elapsed: number): void {
		this.count++;
		this.sum += elapsed;
		if (elapsed > this.max) this.max = elapsed;
		this.times[this.ringPos] = elapsed;
		this.ringPos = this.ringPos + 1 === RING ? 0 : this.ringPos + 1;
		if (this.ringFill < RING) this.ringFill++;
		if (elapsed > this.budgetMs && this.overrunCount < MAX_OVERRUNS) {
			this.overrunElapsed[this.overrunCount] = elapsed;
			this.overrunFrame[this.overrunCount] = this.startFrame;
			this.overrunCount++;
		}
	}

	private flush(): PerfReport {
		const report: PerfReport = {
			type: "perf",
			quanta: this.count,
			max: this.max,
			mean: this.count > 0 ? this.sum / this.count : 0,
			p99: this.percentile(0.99),
			budget: this.budgetMs,
			clock: this.clockSrc.clock,
			overruns: this.collectOverruns(),
		};
		this.reset();
		return report;
	}

	/** p99 over the recent ring (bounded copy-sort, no allocation). */
	private percentile(q: number): number {
		const n = this.ringFill;
		if (n === 0) return 0;
		for (let i = 0; i < n; i++) this.sorted[i] = this.times[i] as number;
		insertionSort(this.sorted, n);
		const idx = Math.min(n - 1, Math.floor(q * (n - 1)));
		return this.sorted[idx] as number;
	}

	private collectOverruns(): PerfOverrun[] {
		const out: PerfOverrun[] = [];
		for (let i = 0; i < this.overrunCount; i++) {
			out.push({
				elapsed: this.overrunElapsed[i] as number,
				frame: this.overrunFrame[i] as number,
			});
		}
		return out;
	}

	private reset(): void {
		this.count = 0;
		this.sum = 0;
		this.max = 0;
		this.overrunCount = 0;
		// ring is intentionally left intact — p99 reflects a sliding recent window.
	}
}

/** In-place insertion sort of the first n entries; fine for RING-sized data. */
function insertionSort(a: Float32Array, n: number): void {
	for (let i = 1; i < n; i++) {
		const v = a[i] as number;
		let j = i - 1;
		while (j >= 0 && (a[j] as number) > v) {
			a[j + 1] = a[j] as number;
			j--;
		}
		a[j + 1] = v;
	}
}
