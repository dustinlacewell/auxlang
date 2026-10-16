/**
 * Where a lane's event tables live in memory (MANIFESTO §8). The lane holds
 * a table slot in the fixed layout: two table pointers and the cycle it
 * wants next. The tables themselves live in the table heap at the top of
 * memory (host/table-heap.ts), each a header and its rows, row-major, so a
 * row's address does not depend on the table's capacity:
 *
 *   slot   cur i32 @0, next i32 @4, want f64 @8 (NaN: nothing wanted)
 *   table  cycle f64 @0, count f64 @8, capacity f64 @16, row stride f64 @24
 *          (bytes), then rows; a row is one f64 per TABLE_ROW_FIELDS field,
 *          in that order, then one f64 per record field of the lane's pattern
 *
 * A lane's stride is fixed at eval by its pattern's record fields
 * (`rowBytes`): the tick's loads use it as a constant, the heap reads it
 * from the header.
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
export const TABLE_STRIDE = 24;
export const TABLE_HEADER = 32;

/** Rows a table starts with, as a fresh JS EventTable. */
export const INITIAL_ROWS = 8;

/** Bytes per row of a lane whose pattern carries `recordFields` record fields. */
export function rowBytes(recordFields: number): number {
	return 8 * (TABLE_ROW_FIELDS.length + recordFields);
}

/** Bytes a table of `rows` rows of `stride` bytes takes (a multiple of 8). */
export function tableBytes(rows: number, stride: number): number {
	return TABLE_HEADER + stride * rows;
}

/** A row field's offset inside its row. */
export function fieldOffset(field: TableRowField): number {
	return 8 * TABLE_ROW_FIELDS.indexOf(field);
}

/** Record field k's offset inside its row. */
export function recordFieldOffset(k: number): number {
	return 8 * (TABLE_ROW_FIELDS.length + k);
}
