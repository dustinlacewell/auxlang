/**
 * How a drag's step count turns into a new value, shaped by the port's unit
 * (MANIFESTO §5.3, `drag-any-number`). `delta` counts discrete drag steps
 * (positive = up), not a pre-scaled magnitude — the caller divides pointer
 * movement by `stepFromDigit`'s step size to get it. A 0..1 port clamps at
 * both ends; a gate snaps to its nearest bound; a semitone port moves by
 * exactly one semitone per step; seconds, Hz and other rate-like units move
 * by a PERCENTAGE of the current value so a drag never crosses zero and
 * small values do not snap to 0.
 *
 * Percentage rate: 1% of the current value per step (`PERCENT_PER_STEP`).
 * Chosen so one step nudges a rate noticeably without overshoot.
 */

import type { Unit } from "@/core3/types";

const PERCENT_PER_STEP = 0.01;

export function shapeByUnit(value: number, delta: number, unit: Unit): number {
	switch (unit) {
		case "unit":
			return clamp(value + delta, 0, 1);
		case "gate":
			return value + delta >= 0.5 ? 1 : 0;
		case "semis":
			return value + Math.sign(delta) * Math.ceil(Math.abs(delta));
		case "secs":
		case "hz":
			return Math.max(value * (1 + delta * PERCENT_PER_STEP), Number.EPSILON);
		default:
			return value + delta;
	}
}

function clamp(value: number, min: number, max: number): number {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}
