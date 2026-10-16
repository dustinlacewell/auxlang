/**
 * Where a lane's event tables live in memory (MANIFESTO §8). The lane holds
 * a table slot in the fixed layout: two table pointers and the cycle it
 * wants next. The tables themselves live in the table heap at the top of
 * memory (host/table-heap.ts), each a header and its rows, row-major, so a
 * row's address does not depend on the table's capacity:
 *
 *   slot   cur i32 @0, next i32 @4, want f64 @8 (NaN: nothing wanted)
 *   table  cycle f64 @0, count f64 @8, capacity f64 @16, then rows; a row
 *          is one f64 per TABLE_ROW_FIELDS field, in that order
 *
 * The tick reads `cur`. On a cycle crossing it swaps to `next` when `next`
 * holds the entering cycle, else the host fills `cur` (the miss path); then
 * it sets `want` to the cycle after, for the host to fill into `next`.
 */

import { TABLE_ROW_FIELDS, type TableRowField } from "../../module/front/intrinsics/table-intrinsics";

export const SLOT_CUR = 0;
export const SLOT_NEXT = 4;
export const SLOT_WANT = 8;
export const SLOT_BYTES = 16;

export const TABLE_CYCLE = 0;
export const TABLE_COUNT = 8;
export const TABLE_CAPACITY = 16;
export const TABLE_HEADER = 24;

export const ROW_BYTES = 8 * TABLE_ROW_FIELDS.length;

/** Rows a table starts with, as a fresh JS EventTable. */
export const INITIAL_ROWS = 8;

/** Bytes a table of `rows` rows takes (a multiple of 8). */
export function tableBytes(rows: number): number {
	return TABLE_HEADER + ROW_BYTES * rows;
}

/** A row field's offset inside its row. */
export function fieldOffset(field: TableRowField): number {
	return 8 * TABLE_ROW_FIELDS.indexOf(field);
}
