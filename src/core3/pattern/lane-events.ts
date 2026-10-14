/** One lane's events from a query, sorted by part onset (the order a track needs). */

import type { Ev } from "./event";
import { laneOf } from "./event";
import { rcmp } from "./rational";

export function laneEvents(evs: readonly Ev[], lane: number): Ev[] {
	return evs.filter((ev) => laneOf(ev) === lane).sort((a, b) => rcmp(a.part.begin, b.part.begin));
}
