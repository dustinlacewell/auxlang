/**
 * The integer register an integer range (front/types/int-range.ts) lives
 * in: an i32 when the range fits int32, else an i64.
 */

import { type Range, fitsI32 } from "../../module/front/types/int-range";
import type { Width } from "./values";

/** The integer kind that holds every value of `r`: an i32 when it fits, else an i64. */
export function widthOf(r: Range | null): Width | null {
	if (r === null) return null;
	return fitsI32(r) ? "int" : "long";
}

/** The wider of two widths. */
export function wider(a: Width, b: Width): Width {
	return a === "long" || b === "long" ? "long" : "int";
}
