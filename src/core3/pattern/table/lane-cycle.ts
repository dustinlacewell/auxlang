/**
 * One lane's events in one cycle, sorted by onset, empty parts dropped. The
 * table's only call into `query`.
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { laneEvents } from "../lane-events";
import { query } from "../query";
import { r, rlt } from "../rational";

export function laneCycle(pat: Pat, seed: number, lane: number, cycle: number): Ev[] {
	const evs = query(pat, { begin: r(cycle), end: r(cycle + 1) }, { seed, path: 0 });
	return laneEvents(evs, lane).filter((ev) => rlt(ev.part.begin, ev.part.end));
}
