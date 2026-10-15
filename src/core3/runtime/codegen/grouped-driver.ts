/**
 * The block driver over compiled group functions (emit-grouped-code.ts): per
 * chunk of at most BLOCK_MAX samples, every group in run order, then the tap
 * sums. Plain code: the groups do the per-sample work.
 */

import type { Driver, ValueBuffers } from "../driver";
import { BLOCK_MAX } from "./group/block-slots";

export type GroupFn = (bufs: ValueBuffers, n: number, count: number, sr: number) => void;
export type TapsFn = (outL: Float32Array, outR: Float32Array, offset: number, n: number) => void;

export function groupedDriver(groups: readonly GroupFn[], taps: TapsFn): Driver {
	return (bufs, outL, outR, offset, n, count, sr) => {
		for (let at = 0; at < n; at += BLOCK_MAX) {
			const m = n - at < BLOCK_MAX ? n - at : BLOCK_MAX;
			for (let g = 0; g < groups.length; g++) (groups[g] as GroupFn)(bufs, m, count + at, sr);
			taps(outL, outR, offset + at, m);
		}
	};
}
