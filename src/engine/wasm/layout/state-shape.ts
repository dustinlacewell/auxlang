/**
 * The memory shape of a lane's non-scalar state, as plain data: a number is
 * an f64, a typed array its elements in their own type, a record its fields
 * at fixed offsets, an array of records equal-shaped records at a stride.
 * Offsets are from the start of the enclosing record (for a lane's
 * top-level fields, from address 0). Every size is a multiple of 8. A
 * rebound field reaches its value through a pointer slot (`Field`), a
 * rebound element of an array of records through its table (`RecordsShape`).
 */

import type { ElementType } from "../../dsp/front/types/element-type";

export type Shape = NumberShape | ArrayShape | RecordShape | RecordsShape;

export interface NumberShape {
	readonly k: "number";
}

export interface ArrayShape {
	readonly k: "array";
	readonly type: ElementType;
	readonly length: number;
}

export interface RecordShape {
	readonly k: "record";
	readonly size: number;
	readonly fields: Readonly<Record<string, Field>>;
}

/**
 * `length` records at a stride of `element.size`. An array whose elements
 * the code rebinds (front/types/element-rebinds.ts) also has a table of i32
 * slots at `pointers` (same base, 4 bytes each, after the records): slot k
 * holds the absolute address of the record element k names now, its own
 * record until the code stores another one there.
 */
export interface RecordsShape {
	readonly k: "records";
	readonly length: number;
	readonly element: RecordShape;
	readonly pointers?: number | undefined;
}

/**
 * A field's own storage at `offset`. A rebound field (front/scope/field-rebinds.ts)
 * also has an i32 `pointer` slot (same base, 8 bytes) holding the absolute
 * address of the value it names now: its own storage until the code rebinds
 * it to another value of its shape.
 */
export interface Field {
	readonly offset: number;
	readonly shape: Shape;
	readonly pointer?: number | undefined;
}

/** A shape that is not a number: what a name can stand for while compiling. */
export type Aggregate = ArrayShape | RecordShape | RecordsShape;

export function isAggregate(shape: Shape): shape is Aggregate {
	return shape.k !== "number";
}
