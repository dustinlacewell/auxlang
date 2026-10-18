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
	SLOT_CUR,
	SLOT_NEXT,
	SLOT_WANT,
	TABLE_CAPACITY,
	TABLE_COUNT,
	TABLE_CYCLE,
	TABLE_HEADER,
	TABLE_STRIDE,
	fieldOffset,
	recordFieldOffset,
	rowBytes,
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
const RECORD = recordFieldOffset(0) / 8;

export class TableHeap {
	private f64: Float64Array;
	private i32: Int32Array;
	private top: number;
	private largest = tableBytes(INITIAL_ROWS, rowBytes(0));

	constructor(
		private readonly memory: WebAssembly.Memory,
		private readonly base: number,
	) {
		this.top = base;
		this.f64 = new Float64Array(memory.buffer);
		this.i32 = new Int32Array(memory.buffer);
	}

	/**
	 * Point a slot at two fresh empty tables (cycle NaN, as a fresh EventTable)
	 * whose rows are `stride` bytes; it wants nothing.
	 */
	init(slot: number, stride: number): void {
		this.views();
		for (const which of [SLOT_CUR, SLOT_NEXT]) {
			const table = this.alloc(INITIAL_ROWS, stride);
			this.i32[(slot + which) / 4] = table;
			this.f64[(table + TABLE_CYCLE) / 8] = Number.NaN;
			this.f64[(table + TABLE_COUNT) / 8] = 0;
		}
		this.f64[(slot + SLOT_WANT) / 8] = Number.NaN;
	}

	/** Copy `t` into the slot's table at `which` (SLOT_CUR or SLOT_NEXT), moving it when full. */
	write(slot: number, which: number, t: EventTable): void {
		const table = this.tableFor(slot, which, t.count);
		const f64 = this.f64;
		const words = this.strideOf(table) / 8;
		if (words * 8 !== rowBytes(t.fields.length)) {
			throw new Error(
				`table heap: a table of ${t.fields.length} record fields does not fit rows of ${words * 8} bytes`,
			);
		}
		f64[(table + TABLE_CYCLE) / 8] = t.cycle;
		f64[(table + TABLE_COUNT) / 8] = t.count;
		for (let r = 0, w = (table + TABLE_HEADER) / 8; r < t.count; r++, w += words) {
			f64[w + BEGIN] = t.begin[r] as number;
			f64[w + END] = t.end[r] as number;
			f64[w + VALUE] = t.value[r] as number;
			f64[w + KIND] = t.kind[r] as number;
			f64[w + NOTE_ID] = t.noteId[r] as number;
			f64[w + SLIDE_FROM] = t.slideFrom[r] as number;
			f64[w + DIP_BEFORE] = t.dipBefore[r] as number;
			for (let k = 0; k < t.fields.length; k++)
				f64[w + RECORD + k] = (t.fields[k] as Float64Array)[r] as number;
		}
	}

	/**
	 * Copy the table at `fromWhich` of slot `fromSlot` in `from` (another
	 * instance's heap) into the slot's table at `which`, moving it when full:
	 * its cycle, count and rows, bit for bit.
	 */
	copy(slot: number, which: number, from: TableHeap, fromSlot: number, fromWhich: number): void {
		from.views();
		const source = from.i32[(fromSlot + fromWhich) / 4] as number;
		const count = from.f64[(source + TABLE_COUNT) / 8] as number;
		const table = this.tableFor(slot, which, count);
		const stride = this.strideOf(table);
		if (from.strideOf(source) !== stride) {
			throw new Error(`table heap: rows of ${from.strideOf(source)} bytes copied into rows of ${stride}`);
		}
		this.f64[(table + TABLE_CYCLE) / 8] = from.f64[(source + TABLE_CYCLE) / 8] as number;
		this.f64[(table + TABLE_COUNT) / 8] = count;
		const rows = (source + TABLE_HEADER) / 8;
		this.f64.set(from.f64.subarray(rows, rows + (count * stride) / 8), (table + TABLE_HEADER) / 8);
	}

	/** Which of the slot's tables holds `cycle`: SLOT_CUR, SLOT_NEXT, or -1 for neither. */
	holding(slot: number, cycle: number): number {
		if (this.cycleAt(slot, SLOT_CUR) === cycle) return SLOT_CUR;
		if (this.cycleAt(slot, SLOT_NEXT) === cycle) return SLOT_NEXT;
		return -1;
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

	/** The slot's table at `which`, moved to a bigger one when `rows` do not fit. */
	private tableFor(slot: number, which: number, rows: number): number {
		this.views();
		let table = this.i32[(slot + which) / 4] as number;
		const capacity = this.f64[(table + TABLE_CAPACITY) / 8] as number;
		if (rows > capacity) {
			table = this.alloc(Math.max(rows, 2 * capacity), this.strideOf(table));
			this.i32[(slot + which) / 4] = table;
		}
		return table;
	}

	/** A table's row stride in bytes. */
	private strideOf(table: number): number {
		this.views();
		return this.f64[(table + TABLE_STRIDE) / 8] as number;
	}

	/** A new table of `rows` rows of `stride` bytes at the top: its address, its capacity and stride set. */
	private alloc(rows: number, stride: number): number {
		const bytes = tableBytes(rows, stride);
		this.room(bytes);
		const at = this.top;
		this.top += bytes;
		this.largest = Math.max(this.largest, bytes);
		this.f64[(at + TABLE_CAPACITY) / 8] = rows;
		this.f64[(at + TABLE_STRIDE) / 8] = stride;
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
