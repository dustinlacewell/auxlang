/**
 * EventTable — one lane of one pattern cycle as flat rows, the only form the
 * bridge reads at audio rate. Rows cover the cycle `[cycle, cycle + 1)` with
 * no gaps and no overlap: a gap between events is a rest row. Per row:
 *
 *   begin/end   absolute position (floats; exactness lives in `query`)
 *   value       the row's value; a rest row holds the value before it
 *   kind        KIND_REST | KIND_NOTE | KIND_TIE
 *   noteId      onset of the row's own note, in absolute beats; a tie carries
 *               its note's id; NaN on a rest row
 *   dipBefore   1 when the next row (peeking the next cycle for the last row)
 *               is a different note touching this one
 *
 * `carryValue`/`carryNoteId` describe what came before row 0. A table is
 * derived data: rebuilt from (pattern, seed, lane, cycle), never migrated.
 */

export const KIND_REST = 0;
export const KIND_NOTE = 1;
export const KIND_TIE = 2;

export interface EventTable {
	/** The cycle the rows cover; NaN before the first fill. */
	cycle: number;
	count: number;
	begin: Float64Array;
	end: Float64Array;
	value: Float64Array;
	kind: Int8Array;
	noteId: Float64Array;
	dipBefore: Int8Array;
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
		dipBefore: new Int8Array(capacity),
		carryValue: 0,
		carryNoteId: Number.NaN,
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
	t.dipBefore = new Int8Array(capacity);
}

export const sounds = (kind: number): boolean => kind !== KIND_REST;
