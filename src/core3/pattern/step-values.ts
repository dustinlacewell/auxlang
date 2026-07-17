/**
 * Trigger-domain flattening for the patstep bridge: the pattern's onset values
 * over a fixed 16-cycle window (enough to cover slowcat loops), in time order,
 * collapsed to their smallest repeating period. Collapsing on values alone is
 * observationally exact for stepping, which sees only the values.
 */

import type { Pat } from "./ast";
import { isOnset } from "./event";
import { query } from "./query";
import { r, rcmp } from "./rational";

export const STEP_WINDOW_CYCLES = 16;

export function stepValues(pat: Pat, seed: number, cycles = STEP_WINDOW_CYCLES): Float64Array {
	const values = query(pat, { begin: r(0), end: r(cycles) }, { seed, path: 0 })
		.filter(isOnset)
		.sort((a, b) => rcmp(a.part.begin, b.part.begin))
		.map((ev) => ev.value);
	return Float64Array.from(minimalPeriod(values));
}

function minimalPeriod(values: readonly number[]): readonly number[] {
	for (let period = 1; period <= values.length >> 1; period++) {
		if (values.length % period !== 0) continue;
		if (values.every((v, i) => v === values[i % period])) return values.slice(0, period);
	}
	return values;
}
