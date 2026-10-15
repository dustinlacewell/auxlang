/**
 * A driver renders a block of samples: per sample it flips the value
 * buffers, walks every node in program order (gathering inputs from `cur`
 * ("n" sources) / `prv` ("z" sources), ticking, scattering outputs into
 * `cur`), and writes the sum of the out-nodes' l/r taps. Per-sample
 * semantics do not depend on the block size. The engine owns the buffers and
 * the sample count; between blocks, `bufs` and every lane state are exactly
 * what the per-sample walk leaves.
 */

import type { BuildConfig } from "./build/build-config";
import type { NodeRun } from "./node-run";
import type { TierConfig } from "./tier/tier-config";

/** The engine's two value buffers. A driver may swap them (the per-sample flip). */
export interface ValueBuffers {
	cur: Float64Array;
	prv: Float64Array;
}

export interface DriverOptions {
	/** Run a generated per-program driver instead of the interpreter. Default off. */
	readonly codegen?: boolean;
	/**
	 * With codegen: phase 2, module ticks pasted inline in the grouped
	 * functions (codegen/emit-grouped-code.ts). Default off: phase 1, the same
	 * groups with every node at a call site.
	 */
	readonly paste?: boolean;
	/** With codegen: the group size budget (codegen/group/group-budget.ts is the default). */
	readonly groupBudget?: number;
	/** With codegen: the per-block build budget and warm rounds (build/build-config.ts is the default). */
	readonly build?: BuildConfig;
	/**
	 * With codegen: start on phase 1, build and warm phase 2 on the shadow
	 * after the swap, then switch to it (tier/). Default off.
	 */
	readonly tierUp?: boolean;
	/** With tierUp: when and how fast phase 2 builds (tier/tier-config.ts is the default). */
	readonly tier?: TierConfig;
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
