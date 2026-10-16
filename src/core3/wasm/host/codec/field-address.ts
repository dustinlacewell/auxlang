/**
 * Where a state field's value is in memory (layout/state-shape.ts `Field`):
 * a rebound field's value is wherever its pointer slot points, any other
 * field's is its own storage. `base` is the address the field's offsets
 * count from (0 for a lane's top-level fields).
 */

import type { Field } from "../../layout/state-shape";

/** The address of the value `field` names now. */
export function valueAddress(memory: ArrayBuffer, base: number, field: Field): number {
	if (field.pointer === undefined) return base + field.offset;
	return new Int32Array(memory, base + field.pointer, 1)[0] as number;
}

/** Point a rebound field at its own storage (a fresh lane, or one a write is about to fill). */
export function pointHome(memory: ArrayBuffer, base: number, field: Field): void {
	if (field.pointer !== undefined) new Int32Array(memory, base + field.pointer, 1)[0] = base + field.offset;
}
