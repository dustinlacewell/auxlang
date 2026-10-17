/**
 * How a drag's step count turns into a new value, shaped by the port's unit
 * (MANIFESTO §5.3, `drag-any-number`). `delta` is the change in the value's
 * own magnitude (positive = up): drag steps times the grabbed digit's place
 * value (`stepFromDigit`). A 0..1 port clamps at both ends; a gate snaps to
 * its nearest bound; a semitone port moves by whole semitones; seconds and
 * Hz stop at 0.
 */

import type { Unit } from "@/core3/types";

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
			return Math.max(value + delta, 0);
		default:
			return value + delta;
	}
}

function clamp(value: number, min: number, max: number): number {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}
