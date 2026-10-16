/**
 * EventTable — one lane of one pattern cycle as flat rows, the only form the
 * bridge reads at audio rate. Rows cover the cycle `[cycle, cycle + 1)` with
 * no gaps and no overlap: a gap between events is a rest row. Per row:
 *
 *   begin/end   absolute position (floats; exactness lives in `query`)
 *   value       the row's value; a rest or tie row holds the value before it
 *   kind        KIND_REST | KIND_NOTE | KIND_TIE | KIND_SLIDE
 *   noteId      onset of the row's own note, in absolute beats; a tie carries
 *               its note's id; NO_NOTE on a rest row
 *   slideFrom   on a slide row, the id of the note it slides from (the row
 *               before it); NO_NOTE otherwise
 *   dipBefore   1 when the next row (peeking the next cycle for the last row)
 *               is a different note touching this one
 *   fields[k]   record field k (pattern/record-fields.ts order): the value of
 *               the last note or slide that carried it; held like `value`
 *
 * `carryValue`/`carryNoteId` describe what came before row 0. A table is
 * derived data: rebuilt from (pattern, seed, lane, cycle), never migrated.
 */

/** The note id of "no note" (a rest, or nothing before). A finite number so reader state stays JSON. */
export const NO_NOTE = -Number.MAX_VALUE;

export const KIND_REST = 0;
export const KIND_NOTE = 1;
export const KIND_TIE = 2;
export const KIND_SLIDE = 3;

export interface EventTable {
	/** The cycle the rows cover; NaN before the first fill. */
	cycle: number;
	count: number;
	begin: Float64Array;
	end: Float64Array;
	value: Float64Array;
	kind: Int8Array;
	noteId: Float64Array;
	slideFrom: Float64Array;
	dipBefore: Int8Array;
	/** One column per record field. */
	fields: Float64Array[];
	carryValue: number;
	carryNoteId: number;
}

export function createTable(capacity = 8): EventTable {
	return {
		cycle: Number.NaN,
		count: 0,
		begin: new Float64Array(capacity),
		end: new Float64Array(capacity),
		value: new Float64Array(capacity),
		kind: new Int8Array(capacity),
		noteId: new Float64Array(capacity),
		slideFrom: new Float64Array(capacity),
		dipBefore: new Int8Array(capacity),
		fields: [],
		carryValue: 0,
		carryNoteId: NO_NOTE,
	};
}

/** Grow the row arrays to hold at least `rows` rows. Contents are not kept. */
export function ensureCapacity(t: EventTable, rows: number): void {
	if (t.begin.length >= rows) return;
	const capacity = Math.max(rows, t.begin.length * 2);
	t.begin = new Float64Array(capacity);
	t.end = new Float64Array(capacity);
	t.value = new Float64Array(capacity);
	t.kind = new Int8Array(capacity);
	t.noteId = new Float64Array(capacity);
	t.slideFrom = new Float64Array(capacity);
	t.dipBefore = new Int8Array(capacity);
	t.fields = t.fields.map(() => new Float64Array(capacity));
}

/** Give the table `count` field columns. Contents are not kept when the count changes. */
export function ensureFields(t: EventTable, count: number): void {
	if (t.fields.length === count) return;
	t.fields = Array.from({ length: count }, () => new Float64Array(t.begin.length));
}

export const sounds = (kind: number): boolean => kind !== KIND_REST;
