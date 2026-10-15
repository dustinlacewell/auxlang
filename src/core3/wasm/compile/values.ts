/**
 * What a name or a field means to the compiler. The tick subset is JS, so a
 * value can be a number, a boolean, a config string, a reducer's lane array
 * or one of the tick's parameter records. Only numbers and booleans exist at
 * run time; the rest are resolved while compiling.
 *
 *   f64    a JS number in an f64
 *   bool   a JS boolean in an i32 (0 or 1)
 *   int    a JS number known to be an int32 (a bitwise result), in an i32
 */

export type Kind = "f64" | "bool" | "int";

/** A value known while compiling: config strings, constants, typeof results. */
export type StaticValue = number | string | boolean | undefined | null;

/** A reducer's input lanes: an f64 view in linear memory, as the engine's Float64Array. */
export interface Lanes {
	readonly addr: number;
	readonly length: number;
}

export type Role = "state" | "ins" | "outs" | "config";

export type Value =
	| { readonly k: "local"; readonly index: number; readonly kind: Kind }
	| { readonly k: "static"; readonly value: StaticValue }
	| { readonly k: "lanes"; readonly lanes: Lanes }
	| { readonly k: "role"; readonly role: Role };

export const local = (index: number, kind: Kind): Value => ({ k: "local", index, kind });
export const fixed = (value: StaticValue): Value => ({ k: "static", value });
