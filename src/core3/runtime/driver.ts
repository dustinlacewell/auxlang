/**
 * A driver renders a block of samples: per sample it flips the value
 * buffers, walks every node in program order (gathering inputs from `cur`
 * ("n" sources) / `prv` ("z" sources), ticking, scattering outputs into
 * `cur`), and writes the sum of the out-nodes' l/r taps. Per-sample
 * semantics do not depend on the block size. The engine owns the buffers and
 * the sample count; between blocks, `bufs` and every lane state are exactly
 * what the per-sample walk leaves. The interpreter (interpret-block.ts) is
 * the one driver.
 */

import type { NodeRun } from "./node-run";

/**
 * The engine's two value buffers, which a driver may swap (the per-sample
 * flip), and its live slots, which only a slot write changes.
 */
export interface ValueBuffers {
	cur: Float64Array;
	prv: Float64Array;
	readonly slots: Float64Array;
}

/** What a driver walks: the built node runs and the slots the out-nodes' l/r land in. */
export interface DriverPlan {
	readonly runs: readonly NodeRun[];
	readonly tapsL: Int32Array;
	readonly tapsR: Int32Array;
}

/**
 * Render `n` samples into `outL`/`outR` from `offset`. `count` is the engine's
 * sample count at the block's first sample (lambda time = (count + k) / sr).
 */
export type Driver = (
	bufs: ValueBuffers,
	outL: Float32Array,
	outR: Float32Array,
	offset: number,
	n: number,
	count: number,
	sr: number,
) => void;
