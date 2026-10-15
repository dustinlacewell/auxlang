/**
 * The steps of one layer in one cycle's events: the distinct onsets of the
 * events that start there (rests and ties included), in time order. Events
 * sharing an onset are one step, so a chord is one step. A fragment of an
 * event that started in an earlier cycle is not a step here.
 */

import type { Ev } from "./event";
import { laneOf, startsHere } from "./event";
import { type R, rcmp, req } from "./rational";
import type { LaneRange } from "./step-layers";

export const inLayer = (ev: Ev, layer: LaneRange): boolean =>
	laneOf(ev) >= layer.lo && laneOf(ev) < layer.hi;

export function stepOnsets(evs: readonly Ev[], layer: LaneRange): R[] {
	const begins = evs
		.filter((ev) => inLayer(ev, layer) && startsHere(ev))
		.map((ev) => (ev.whole as NonNullable<Ev["whole"]>).begin)
		.sort(rcmp);
	return begins.filter((at, i) => i === 0 || !req(at, begins[i - 1] as R));
}
