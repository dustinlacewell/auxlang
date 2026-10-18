/**
 * The shape of a state value, as plain data (state-shape-of.ts derives it).
 * The checker (check-state.ts) and the types (types/value-ty.ts) read it,
 * the WASM layout (wasm/program/state-layout.ts) adds offsets on top of it,
 * and both carries decide a fit by comparing two of them (shape-fits.ts).
 *
 * Module state holds numbers, typed arrays, records and arrays of records of
 * one shape. The other kinds describe what a state can still hold under some
 * config, so every part sees the whole value: a boolean, a plain array that
 * is not such an array of records (`list`), and a value with no number form
 * (`other`).
 */

import type { ElementType } from "../types/element-type";

export type StateShape =
	| NumberState
	| BooleanState
	| ArrayState
	| RecordState
	| RecordsState
	| ListState
	| OtherState;

export interface NumberState {
	readonly k: "number";
}

export interface BooleanState {
	readonly k: "boolean";
}

/** A number typed array: its element type and length. */
export interface ArrayState {
	readonly k: "array";
	readonly type: ElementType;
	readonly length: number;
}

/** A record's fields, in key order. */
export interface RecordState {
	readonly k: "record";
	readonly fields: Readonly<Record<string, StateShape>>;
}

/** A non-empty array of records that all have `element`'s shape, keys in the same order. */
export interface RecordsState {
	readonly k: "records";
	readonly length: number;
	readonly element: RecordState;
}

/** Any other plain array, item by item. */
export interface ListState {
	readonly k: "list";
	readonly items: readonly StateShape[];
}

/**
 * A value with no number form, named as an error names it ("null", "a
 * string", "a BigInt64Array"); `bytes` is a non-number view's byte length.
 */
export interface OtherState {
	readonly k: "other";
	readonly what: string;
	readonly bytes?: number | undefined;
}
