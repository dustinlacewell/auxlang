/**
 * Simultaneity analysis for the seq bridge: how many lanes a pattern needs,
 * and how events pack into them.
 */

import type { Pat } from "./ast";
import type { Ev } from "./event";
import { period } from "./period";
import { query } from "./query";
import { r, rcmp, rlte } from "./rational";

/**
 * Lane count for a seq: max simultaneous events over the pattern's full period,
 * floored at 1. Touching parts don't overlap. Querying the true period (not a
 * fixed window) guarantees a late-entering voice or a late chord is seen — a
 * fixed window undercounts both. A seq always needs at least one lane, even for
 * an all-rest pattern whose true simultaneity is zero.
 */
export function maxWidth(pat: Pat): number {
	const evs = query(pat, { begin: r(0), end: r(period(pat)) }, { seed: 0, path: 0 });
	const marks = evs.flatMap((ev) => [
		{ t: ev.part.begin, delta: 1 },
		{ t: ev.part.end, delta: -1 },
	]);
	// Ends sort before begins at equal time, so back-to-back events don't stack.
	marks.sort((a, b) => rcmp(a.t, b.t) || a.delta - b.delta);
	let width = 0;
	let current = 0;
	for (const mark of marks) {
		current += mark.delta;
		if (current > width) width = current;
	}
	return Math.max(1, width);
}

/** Greedy lane packing: by part.begin ascending, first lane whose last event has ended. */
export function packLanes(evs: readonly Ev[]): Ev[][] {
	const sorted = [...evs].sort((a, b) => rcmp(a.part.begin, b.part.begin));
	const lanes: Ev[][] = [];
	for (const ev of sorted) {
		const lane = lanes.find((l) => {
			const last = l[l.length - 1];
			return last !== undefined && rlte(last.part.end, ev.part.begin);
		});
		if (lane) lane.push(ev);
		else lanes.push([ev]);
	}
	return lanes;
}
