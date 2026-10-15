/**
 * Integer ranges: an expression with a range always evaluates to an integer
 * in [lo, hi] — never -0, never NaN, never a fraction. Bounds stay within
 * ±2^53, where JS's f64 arithmetic on integers is exact, so a range's
 * arithmetic is the JS result. A range inside int32 lets the value live in
 * an i32 (int-range-of.ts decides, the emitters follow).
 */

export interface Range {
	readonly lo: number;
	readonly hi: number;
}

export const I32_MIN = -(2 ** 31);
export const I32_MAX = 2 ** 31 - 1;
export const INT32: Range = { lo: I32_MIN, hi: I32_MAX };
export const UINT32: Range = { lo: 0, hi: 2 ** 32 - 1 };

/** A range when both bounds are exact integers (±2^53); null otherwise. */
export function safeRange(lo: number, hi: number): Range | null {
	const safe = Number.isSafeInteger(lo) && Number.isSafeInteger(hi);
	return safe && lo <= hi ? { lo, hi } : null;
}

/** The range of a constant: an exact integer that is not -0. */
export function constantRange(v: unknown): Range | null {
	if (typeof v !== "number" || !Number.isSafeInteger(v) || Object.is(v, -0)) return null;
	return { lo: v, hi: v };
}

export function fitsI32(r: Range | null): r is Range {
	return r !== null && r.lo >= I32_MIN && r.hi <= I32_MAX;
}

/** Every value of `r` is in [lo, hi]. */
export function within(r: Range | null, lo: number, hi: number): r is Range {
	return r !== null && r.lo >= lo && r.hi <= hi;
}

export function includes(r: Range, v: number): boolean {
	return r.lo <= v && v <= r.hi;
}

export function union(a: Range | null, b: Range | null): Range | null {
	if (a === null || b === null) return null;
	return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) };
}

/** `r` cut to int32: what an i32 holding one of its values can hold. */
export function toI32(r: Range | null): Range {
	if (r === null) return INT32;
	return { lo: Math.max(r.lo, I32_MIN), hi: Math.min(r.hi, I32_MAX) };
}
