/**
 * A typed array's element type: each array keeps its own type, so a load
 * gives back what the JS array would and a store rounds or wraps as the JS
 * array does.
 */

export type ElementType = "f64" | "f32" | "i32" | "u32" | "i16" | "u16" | "i8" | "u8" | "u8c";

/** The element type of a number typed array; null for anything else (BigInt arrays, DataView). */
export function elementTypeOf(value: unknown): ElementType | null {
	if (value instanceof Float64Array) return "f64";
	if (value instanceof Float32Array) return "f32";
	if (value instanceof Int32Array) return "i32";
	if (value instanceof Uint32Array) return "u32";
	if (value instanceof Int16Array) return "i16";
	if (value instanceof Uint16Array) return "u16";
	if (value instanceof Int8Array) return "i8";
	if (value instanceof Uint8ClampedArray) return "u8c";
	if (value instanceof Uint8Array) return "u8";
	return null;
}
