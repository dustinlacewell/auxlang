/**
 * The vertical range a scope trace is drawn against, frame to frame. A fixed
 * range (`scope({ min, max })`, min < max) is used as is. Otherwise the range
 * grows at once to cover what the buffer holds, and shrinks toward it with a
 * SHRINK_SECS time constant, so the picture does not rescale every frame. A
 * flat signal sits mid-height in a range 1 wide.
 */

import type { Range } from "./trace-stats";

const SHRINK_SECS = 1;

export function nextRange(
	prev: Range | undefined,
	seen: Range,
	fixed: Range | null,
	dtSecs: number,
): Range {
	if (fixed !== null) return fixed;
	const target = seen.max > seen.min ? seen : { min: seen.min - 0.5, max: seen.max + 0.5 };
	if (prev === undefined) return target;
	const k = 1 - Math.exp(-dtSecs / SHRINK_SECS);
	return {
		min: target.min < prev.min ? target.min : prev.min + (target.min - prev.min) * k,
		max: target.max > prev.max ? target.max : prev.max + (target.max - prev.max) * k,
	};
}

/** `config.min`/`config.max` as a fixed range when both are numbers and min < max, else null (fit). */
export function fixedRange(config: Readonly<Record<string, unknown>>): Range | null {
	const { min, max } = config;
	if (typeof min !== "number" || typeof max !== "number" || !(min < max)) return null;
	return { min, max };
}
