/**
 * locate — the row of `t` that holds position `pos`. Starts at the reader's
 * last row and walks a step or two either way (the common case: the position
 * moved a little); a longer move binary-searches. Allocates nothing.
 * Positions outside the table clamp to its first or last row.
 */

import type { EventTable } from "./event-table";

const WALK_STEPS = 2;

export function locate(t: EventTable, pos: number, cursor: number): number {
	const last = t.count - 1;
	let i = Math.min(Math.max(cursor | 0, 0), last);
	for (let step = 0; step <= WALK_STEPS; step++) {
		if (pos < (t.begin[i] as number)) {
			if (i === 0) return 0;
			i--;
		} else if (pos >= (t.end[i] as number)) {
			if (i === last) return last;
			i++;
		} else return i;
	}
	return search(t, pos);
}

/** The last row whose begin is at or before `pos` (row 0 when none is). */
function search(t: EventTable, pos: number): number {
	let lo = 0;
	let hi = t.count - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if ((t.begin[mid] as number) <= pos) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}
