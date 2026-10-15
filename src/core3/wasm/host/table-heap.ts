/**
 * The table heap (layout/table-format.ts): event tables at the top of an
 * instance's memory, above the fixed layout. Each table lane's slot points at
 * two tables. A table that a fill outgrows moves to a bigger slot, so WASM
 * tables grow as the JS `ensureCapacity` does; the old one is left behind
 * (growth doubles, so a lane leaves less than its live size). Slots are
 * taken from the top; memory grows when they run out.
 *
 * `memory.grow` detaches every view on the old buffer. The heap's own views
 * follow the buffer on each use; the engine refreshes its views after a
 * render and after the heap's work (wasm-engine.ts). `keepReserve` grows
 * between renders so a fill inside `render` (the miss path) finds room and
 * does not grow there unless one cycle outgrows twice the largest table.
 */

import type { EventTable } from "../../pattern/table/event-table";
import {
	INITIAL_ROWS,
	ROW_BYTES,
	SLOT_CUR,
	SLOT_NEXT,
	SLOT_WANT,
	TABLE_CAPACITY,
	TABLE_COUNT,
	TABLE_CYCLE,
	TABLE_HEADER,
	fieldOffset,
	tableBytes,
} from "../layout/table-format";
import { PAGE } from "../program/memory-layout";

/** Row field offsets in f64 words, in TABLE_ROW_FIELDS order. */
const BEGIN = fieldOffset("begin") / 8;
const END = fieldOffset("end") / 8;
const VALUE = fieldOffset("value") / 8;
const KIND = fieldOffset("kind") / 8;
const NOTE_ID = fieldOffset("noteId") / 8;
const SLIDE_FROM = fieldOffset("slideFrom") / 8;
const DIP_BEFORE = fieldOffset("dipBefore") / 8;
const ROW_WORDS = ROW_BYTES / 8;

export class TableHeap {
	private f64: Float64Array;
	private i32: Int32Array;
	private top: number;
	private largest = tableBytes(INITIAL_ROWS);

	constructor(
		private readonly memory: WebAssembly.Memory,
		private readonly base: number,
	) {
		this.top = base;
		this.f64 = new Float64Array(memory.buffer);
		this.i32 = new Int32Array(memory.buffer);
	}

	/** Point a slot at two fresh empty tables (cycle NaN, as a fresh EventTable); it wants nothing. */
	init(slot: number): void {
		this.views();
		for (const which of [SLOT_CUR, SLOT_NEXT]) {
			const table = this.alloc(INITIAL_ROWS);
			this.i32[(slot + which) / 4] = table;
			this.f64[(table + TABLE_CYCLE) / 8] = Number.NaN;
			this.f64[(table + TABLE_COUNT) / 8] = 0;
		}
		this.f64[(slot + SLOT_WANT) / 8] = Number.NaN;
	}

	/** Copy `t` into the slot's table at `which` (SLOT_CUR or SLOT_NEXT), moving it when full. */
	write(slot: number, which: number, t: EventTable): void {
		this.views();
		let table = this.i32[(slot + which) / 4] as number;
		const capacity = this.f64[(table + TABLE_CAPACITY) / 8] as number;
		if (t.count > capacity) {
			table = this.alloc(Math.max(t.count, 2 * capacity));
			this.i32[(slot + which) / 4] = table;
		}
		const f64 = this.f64;
		f64[(table + TABLE_CYCLE) / 8] = t.cycle;
		f64[(table + TABLE_COUNT) / 8] = t.count;
		for (let r = 0, w = (table + TABLE_HEADER) / 8; r < t.count; r++, w += ROW_WORDS) {
			f64[w + BEGIN] = t.begin[r] as number;
			f64[w + END] = t.end[r] as number;
			f64[w + VALUE] = t.value[r] as number;
			f64[w + KIND] = t.kind[r] as number;
			f64[w + NOTE_ID] = t.noteId[r] as number;
			f64[w + SLIDE_FROM] = t.slideFrom[r] as number;
			f64[w + DIP_BEFORE] = t.dipBefore[r] as number;
		}
	}

	/** The cycle the slot's table at `which` holds. */
	cycleAt(slot: number, which: number): number {
		this.views();
		const table = this.i32[(slot + which) / 4] as number;
		return this.f64[(table + TABLE_CYCLE) / 8] as number;
	}

	/** The cycle the slot wants filled into `next` (NaN: none). */
	want(slot: number): number {
		this.views();
		return this.f64[(slot + SLOT_WANT) / 8] as number;
	}

	clearWant(slot: number): void {
		this.views();
		this.f64[(slot + SLOT_WANT) / 8] = Number.NaN;
	}

	/** Grow now, between renders, so twice the largest table fits without growing. */
	keepReserve(): void {
		this.room(2 * this.largest);
	}

	/** A new table of `rows` rows at the top: its address, its capacity set. */
	private alloc(rows: number): number {
		const bytes = tableBytes(rows);
		this.room(bytes);
		const at = this.top;
		this.top += bytes;
		this.largest = Math.max(this.largest, bytes);
		this.f64[(at + TABLE_CAPACITY) / 8] = rows;
		return at;
	}

	/** Make `bytes` free above the top: grow by at least the heap's size, so grows stay rare. */
	private room(bytes: number): void {
		const short = this.top + bytes - this.memory.buffer.byteLength;
		if (short <= 0) return;
		this.memory.grow(Math.ceil(Math.max(short, this.top - this.base) / PAGE));
		this.views();
	}

	/** Follow the buffer after a grow. */
	private views(): void {
		if (this.f64.buffer === this.memory.buffer) return;
		this.f64 = new Float64Array(this.memory.buffer);
		this.i32 = new Int32Array(this.memory.buffer);
	}
}
