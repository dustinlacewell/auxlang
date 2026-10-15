/**
 * Worklet message protocol. A swap carries a prepared program
 * (prepare/prepare-program.ts): plain data, made on the main thread. Library
 * module code is bundled into the worklet. Code crosses this boundary only
 * as strings: user-written code riding inside the Program (inline lambdas,
 * PortSrc "l" entries; patch-defined module specs, Program.specs, hydrated
 * per engine by runtime/hydrate-specs) and the generated driver units.
 */

import type { PreparedProgram } from "../prepare/prepare-program";

/** Main thread -> worklet. */
export type WorkletMessage =
	| { readonly type: "swap"; readonly prepared: PreparedProgram }
	| { readonly type: "stop" }
	| { readonly type: "perf"; readonly enabled: boolean };

/** A single missed-deadline event: how long the quantum took and when. */
export interface PerfOverrun {
	readonly elapsed: number; // ms spent in process() for this quantum
	readonly frame: number; // currentFrame at the START of the quantum
}

/** Which wall-clock the worklet had available (affects how to read the ms). */
export type PerfClock = "performance.now" | "Date.now" | "none";

/** One reporting window's worth of render-quantum timing stats. */
export interface PerfReport {
	readonly type: "perf";
	readonly quanta: number; // quanta measured in this window (excludes warm-up)
	readonly max: number; // slowest quantum (ms)
	readonly mean: number; // mean quantum time (ms)
	readonly p99: number; // 99th-percentile quantum time (ms)
	readonly budget: number; // deadline budget used to flag overruns (ms)
	readonly clock: PerfClock; // timing source; "none" ⇒ all ms are 0 (no clock)
	readonly overruns: readonly PerfOverrun[]; // quanta that blew the budget
}

/** Worklet -> main thread. Build failures must be loud, not swallowed. */
export type WorkletReply = { readonly type: "error"; readonly message: string } | PerfReport;
