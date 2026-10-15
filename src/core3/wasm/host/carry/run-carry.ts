/**
 * Run a carry plan (carry-run.ts) from the old instance's memory into the
 * new one's. `bindCarry` builds a pair of views per run, ahead (a build
 * step: it allocates); `runCarry` is the swap block's work: one `set` per
 * run, which copies same-typed views byte for byte (every bit kept) at
 * memcpy speed, and allocates nothing.
 */

import type { WasmMemory } from "../wasm-memory";
import { CARRY_F64, RUN_WIDTH } from "./carry-run";

export interface CarryViews {
	/** The old memory the views read; a grown memory needs new views. */
	readonly source: ArrayBuffer;
	readonly f64From: readonly Float64Array[];
	readonly f64To: readonly Float64Array[];
	readonly wordFrom: readonly Int32Array[];
	readonly wordTo: readonly Int32Array[];
}

export function bindCarry(plan: Int32Array, from: WasmMemory, to: WasmMemory): CarryViews {
	const views = { f64From: [] as Float64Array[], f64To: [] as Float64Array[] };
	const words = { wordFrom: [] as Int32Array[], wordTo: [] as Int32Array[] };
	for (let r = 0; r < plan.length; r += RUN_WIDTH) {
		const src = plan[r] as number;
		const dst = plan[r + 1] as number;
		const count = plan[r + 2] as number;
		if (plan[r + 3] === CARRY_F64) {
			views.f64From.push(from.f64.subarray(src, src + count));
			views.f64To.push(to.f64.subarray(dst, dst + count));
		} else {
			words.wordFrom.push(from.i32.subarray(src, src + count));
			words.wordTo.push(to.i32.subarray(dst, dst + count));
		}
	}
	return { source: from.f64.buffer as ArrayBuffer, ...views, ...words };
}

export function runCarry(views: CarryViews): void {
	const { f64From, f64To, wordFrom, wordTo } = views;
	for (let i = 0; i < f64To.length; i++) (f64To[i] as Float64Array).set(f64From[i] as Float64Array);
	for (let i = 0; i < wordTo.length; i++) (wordTo[i] as Int32Array).set(wordFrom[i] as Int32Array);
}
