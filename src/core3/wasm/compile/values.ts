/**
 * What a name or a field means to the compiler. The tick subset is JS, so a
 * value can be a number, a boolean, a config string, state in memory (a
 * typed array, a record) or one of the tick's parameter records. Only
 * numbers and booleans exist at run time; the rest are resolved while
 * compiling.
 *
 *   f64    a JS number in an f64
 *   bool   a JS boolean in an i32 (0 or 1)
 *   int    a JS number known to be an int32 (a bitwise result, or an
 *          integer whose plan range fits), in an i32
 *   long   a JS number known to be an integer within ±2^53 that may not
 *          fit int32 (a sum of two int32s), in an i64
 */

import type { StaticValue } from "../../module/front/types/ty";
import type { Shape } from "../layout/state-shape";

export type Kind = "f64" | "bool" | "int" | "long";

/** The two integer kinds. */
export type Width = "int" | "long";

/** A place in linear memory: the i32 local holding a run-time base (null: none) plus a constant offset. */
export interface Address {
	readonly base: number | null;
	readonly offset: number;
}

export type Role = "state" | "ins" | "outs" | "config";

/**
 * `local`: an `int` or `long` local holds a value its plan type gives an
 * integer range (front/types/int-range.ts). `memory`: state in linear memory (layout/state-shape.ts) — an f64 number, a
 * typed array, a record or an array of records. A reducer's gathered lanes
 * are an f64 array, as the engine's Float64Array.
 */
export type Value =
	| { readonly k: "local"; readonly index: number; readonly kind: Kind }
	| { readonly k: "static"; readonly value: StaticValue }
	| { readonly k: "memory"; readonly shape: Shape; readonly at: Address }
	| { readonly k: "role"; readonly role: Role };

export type MemoryValue = Value & { readonly k: "memory" };

export const local = (index: number, kind: Kind): Value => ({ k: "local", index, kind });
export const fixed = (value: StaticValue): Value => ({ k: "static", value });
export const inMemory = (shape: Shape, at: Address): MemoryValue => ({ k: "memory", shape, at });
