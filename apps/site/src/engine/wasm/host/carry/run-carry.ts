/**
 * Run a carry plan (carry-run.ts) from the old instance's memory into the
 * new one's. `bindCarry` builds a pair of views per fixed run and keeps the
 * runs that read through old pointer slots, ahead (a build step: it
 * allocates); `runCarry` is the swap block's work: one `set` per fixed run,
 * which copies same-typed views byte for byte (every bit kept) at memcpy
 * speed, then the pointer runs word by word from the slots' values at the
 * swap. It allocates nothing.
 */

import type { WasmMemory } from "../wasm-memory";
import { CARRY_DEREF, CARRY_F64, CARRY_POP, CARRY_REL, CARRY_WORD, RUN_WIDTH } from "./carry-run";

export interface CarryViews {
	/** The old memory the views read and the new one they write; a grown memory needs new views. */
	readonly source: ArrayBuffer;
	readonly target: ArrayBuffer;
	readonly f64From: readonly Float64Array[];
	readonly f64To: readonly Float64Array[];
	readonly wordFrom: readonly Int32Array[];
	readonly wordTo: readonly Int32Array[];
	readonly pointers: PointerRuns;
}

/** The runs that read through old pointer slots, with the whole memories as words and the base stack. */
interface PointerRuns {
	readonly runs: Int32Array;
	readonly from: Int32Array;
	readonly to: Int32Array;
	readonly bases: Int32Array;
}

export function bindCarry(plan: Int32Array, from: WasmMemory, to: WasmMemory): CarryViews {
	const views = { f64From: [] as Float64Array[], f64To: [] as Float64Array[] };
	const words = { wordFrom: [] as Int32Array[], wordTo: [] as Int32Array[] };
	const pointer: number[] = [];
	for (let r = 0; r < plan.length; r += RUN_WIDTH) {
		const src = plan[r] as number;
		const dst = plan[r + 1] as number;
		const count = plan[r + 2] as number;
		const type = plan[r + 3];
		if (type === CARRY_F64) {
			views.f64From.push(from.f64.subarray(src, src + count));
			views.f64To.push(to.f64.subarray(dst, dst + count));
		} else if (type === CARRY_WORD) {
			words.wordFrom.push(from.i32.subarray(src, src + count));
			words.wordTo.push(to.i32.subarray(dst, dst + count));
		} else pointer.push(src, dst, count, type as number);
	}
	const runs = Int32Array.from(pointer);
	const bases = new Int32Array(runs.length / RUN_WIDTH);
	return {
		source: from.f64.buffer as ArrayBuffer,
		target: to.f64.buffer as ArrayBuffer,
		...views,
		...words,
		pointers: { runs, from: from.i32, to: to.i32, bases },
	};
}

/** Whether `views` were bound on these very memories (neither has grown since). */
export function carryCurrent(views: CarryViews, from: WasmMemory, to: WasmMemory): boolean {
	return views.source === from.f64.buffer && views.target === to.f64.buffer;
}

export function runCarry(views: CarryViews): void {
	const { f64From, f64To, wordFrom, wordTo } = views;
	for (let i = 0; i < f64To.length; i++) (f64To[i] as Float64Array).set(f64From[i] as Float64Array);
	for (let i = 0; i < wordTo.length; i++) (wordTo[i] as Int32Array).set(wordFrom[i] as Int32Array);
	runPointers(views.pointers);
}

/** The pointer runs: the base is a word address in the old memory, 0 at the top. */
function runPointers({ runs, from, to, bases }: PointerRuns): void {
	let base = 0;
	let depth = 0;
	for (let r = 0; r < runs.length; r += RUN_WIDTH) {
		const type = runs[r + 3];
		if (type === CARRY_DEREF) {
			bases[depth++] = base;
			base = (from[base + (runs[r] as number)] as number) >> 2;
		} else if (type === CARRY_POP) base = bases[--depth] as number;
		else if (type === CARRY_REL) {
			const src = base + (runs[r] as number);
			const dst = runs[r + 1] as number;
			const count = runs[r + 2] as number;
			for (let k = 0; k < count; k++) to[dst + k] = from[src + k] as number;
		}
	}
}
