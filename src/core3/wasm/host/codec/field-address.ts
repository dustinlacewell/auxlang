/**
 * Where a state value is in memory (layout/state-shape.ts): a rebound
 * field's value, or a rebound element of an array of records, is wherever
 * its pointer slot points; any other is its own storage. `base` is the
 * address the field's offsets count from (0 for a lane's top-level fields),
 * `at` the address of an array of records.
 */

import type { Field, RecordsShape } from "../../layout/state-shape";

/** The address of the value `field` names now. */
export function valueAddress(memory: ArrayBuffer, base: number, field: Field): number {
	if (field.pointer === undefined) return base + field.offset;
	return new Int32Array(memory, base + field.pointer, 1)[0] as number;
}

/** Point a rebound field at its own storage (a fresh lane, or one a write is about to fill). */
export function pointHome(memory: ArrayBuffer, base: number, field: Field): void {
	if (field.pointer !== undefined) new Int32Array(memory, base + field.pointer, 1)[0] = base + field.offset;
}

/** The address of the record element `k` of the array at `at` names now. */
export function elementAddress(memory: ArrayBuffer, at: number, shape: RecordsShape, k: number): number {
	if (shape.pointers === undefined) return at + k * shape.element.size;
	return new Int32Array(memory, at + shape.pointers + 4 * k, 1)[0] as number;
}

/** Point every element of the array at `at` at its own record. */
export function pointElementsHome(memory: ArrayBuffer, at: number, shape: RecordsShape): void {
	if (shape.pointers === undefined) return;
	const slots = new Int32Array(memory, at + shape.pointers, shape.length);
	for (let k = 0; k < shape.length; k++) slots[k] = at + k * shape.element.size;
}
