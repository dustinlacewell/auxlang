/**
 * Ranges through binary operators. `+`, `-` and `*` of integers are exact
 * while the bounds stay within ±2^53; a product that could be 0 times a
 * negative is -0, and so is a remainder of a negative dividend, so those
 * have no range. Bitwise results are int32 (`>>>` uint32), narrower when
 * the operands' ranges say so; they have a range whatever the operands.
 */

import {
	I32_MAX,
	INT32,
	type Range,
	UINT32,
	fitsI32,
	includes,
	safeRange,
	within,
} from "./int-range";

const BITWISE: ReadonlySet<string> = new Set(["&", "|", "^", "<<", ">>", ">>>"]);

/** `shift`: the known shift count (JS uses its low five bits), or null. */
export function binaryRange(
	op: string,
	a: Range | null,
	b: Range | null,
	shift: number | null,
): Range | null {
	if (BITWISE.has(op)) return bitwiseRange(op, a, b, shift);
	if (a === null || b === null) return null;
	switch (op) {
		case "+":
			return safeRange(a.lo + b.lo, a.hi + b.hi);
		case "-":
			return safeRange(a.lo - b.hi, a.hi - b.lo);
		case "*":
			return productRange(a, b);
		case "%":
			return remainderRange(a, b);
		default:
			return null;
	}
}

function productRange(a: Range, b: Range): Range | null {
	if ((includes(a, 0) && b.lo < 0) || (includes(b, 0) && a.lo < 0)) return null;
	const corners = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
	return safeRange(Math.min(...corners), Math.max(...corners));
}

/** x % y has the sign of x: a negative x can give -0, a y of 0 gives NaN. */
function remainderRange(a: Range, b: Range): Range | null {
	if (includes(b, 0) || a.lo < 0) return null;
	const least = Math.min(Math.abs(b.lo), Math.abs(b.hi));
	if (a.hi < least) return a;
	const most = Math.max(Math.abs(b.lo), Math.abs(b.hi));
	return { lo: 0, hi: Math.min(a.hi, most - 1) };
}

const nonNegative = (r: Range | null): r is Range => within(r, 0, I32_MAX);
const isZero = (r: Range | null): boolean => r?.lo === 0 && r.hi === 0;

function bitwiseRange(op: string, a: Range | null, b: Range | null, shift: number | null): Range {
	switch (op) {
		case "&":
			if (nonNegative(a) && nonNegative(b)) return { lo: 0, hi: Math.min(a.hi, b.hi) };
			if (nonNegative(a)) return { lo: 0, hi: a.hi };
			if (nonNegative(b)) return { lo: 0, hi: b.hi };
			return INT32;
		case "|":
		case "^":
			if (isZero(b) && fitsI32(a)) return a;
			if (isZero(a) && fitsI32(b)) return b;
			if (nonNegative(a) && nonNegative(b)) return { lo: 0, hi: allOnes(Math.max(a.hi, b.hi)) };
			return INT32;
		case ">>": {
			const x = fitsI32(a) ? a : INT32;
			if (shift === null) return { lo: Math.min(x.lo, 0), hi: Math.max(x.hi, 0) };
			return { lo: x.lo >> shift, hi: x.hi >> shift };
		}
		case ">>>":
			return unsignedShiftRange(a, shift);
		default:
			return INT32;
	}
}

function unsignedShiftRange(a: Range | null, shift: number | null): Range {
	if (nonNegative(a))
		return shift === null ? { lo: 0, hi: a.hi } : { lo: a.lo >>> shift, hi: a.hi >>> shift };
	if (shift === null || shift === 0) return UINT32;
	return { lo: 0, hi: UINT32.hi >>> shift };
}

/** The smallest 2^k - 1 at or above `n`: an OR or XOR of values up to n stays below it. */
function allOnes(n: number): number {
	return n === 0 ? 0 : 2 ** (32 - Math.clz32(n)) - 1;
}
