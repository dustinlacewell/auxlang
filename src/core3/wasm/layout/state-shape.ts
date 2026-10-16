/**
 * The memory shape of a lane's non-scalar state, as plain data: a number is
 * an f64, a typed array its elements in their own type, a record its fields
 * at fixed offsets, an array of records equal-shaped records at a stride.
 * Offsets are from the start of the enclosing record (for a lane's
 * top-level fields, from address 0). Every size is a multiple of 8.
 */

import type { ElementType } from "../../module/front/types/element-type";

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

export interface RecordsShape {
	readonly k: "records";
	readonly length: number;
	readonly element: RecordShape;
}

export interface Field {
	readonly offset: number;
	readonly shape: Shape;
}

/** A shape that is not a number: what a name can stand for while compiling. */
export type Aggregate = ArrayShape | RecordShape | RecordsShape;

export function isAggregate(shape: Shape): shape is Aggregate {
	return shape.k !== "number";
}
