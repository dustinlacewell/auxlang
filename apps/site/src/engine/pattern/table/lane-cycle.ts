/**
 * One lane's events in one cycle, sorted by onset, empty parts dropped. The
 * table's only call into `query`: `cycleQuery` is the query of a whole cycle
 * (every lane), `laneOf` picks one lane from it, so lanes can share a query
 * (cycle-queries.ts).
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { laneEvents } from "../lane-events";
import { query } from "../query";
import { r, rlt } from "../rational";

export function laneCycle(pat: Pat, seed: number, lane: number, cycle: number): Ev[] {
	return laneOf(cycleQuery(pat, seed, cycle), lane);
}

/** Every lane's events in one cycle. */
export function cycleQuery(pat: Pat, seed: number, cycle: number): Ev[] {
	return query(pat, { begin: r(cycle), end: r(cycle + 1) }, { seed, path: 0 });
}

/** One lane of a cycle's query, sorted by onset, empty parts dropped. */
export function laneOf(evs: readonly Ev[], lane: number): Ev[] {
	return laneEvents(evs, lane).filter((ev) => rlt(ev.part.begin, ev.part.end));
}
