/**
 * `stable` placement. A note with the value of a voice that ends right where
 * it begins is a common tone held across a change: it takes that voice's
 * lane. The other notes take the lowest free lanes, in child-lane order.
 *
 * With n at least the structural width a free lane always exists. A voice can
 * still look busy when its note vanished early (`every` or `slowcat` switched
 * away mid-note); then the voice that ends first gives up its lane.
 */

import type { Ev } from "../event";
import { type R, rcmp, req, rlte } from "../rational";
import type { Place } from "./assign-cycle";
import type { Voice } from "./voice-state";

export const placeStable: Place = (lanes, notes, t) => {
	const taken = new Set<number>();
	const held = notes.map((ev) => claim(taken, heldLane(lanes, ev, t, taken)));
	return held.map((lane) => lane ?? claim(taken, freeLane(lanes, t, taken)) as number);
};

function claim(taken: Set<number>, lane: number | undefined): number | undefined {
	if (lane !== undefined) taken.add(lane);
	return lane;
}

/** The lane of an untaken voice that ends at `t` with the note's value. */
function heldLane(lanes: readonly (Voice | null)[], ev: Ev, t: R, taken: ReadonlySet<number>): number | undefined {
	const lane = lanes.findIndex((v, i) => !taken.has(i) && v !== null && req(v.end, t) && v.value === ev.value);
	return lane < 0 ? undefined : lane;
}

/** The lowest untaken lane free at `t`, else the untaken lane whose voice ends first. */
function freeLane(lanes: readonly (Voice | null)[], t: R, taken: ReadonlySet<number>): number {
	let first = -1;
	for (let i = 0; i < lanes.length; i++) {
		if (taken.has(i)) continue;
		const v = lanes[i] as Voice | null;
		if (v === null || rlte(v.end, t)) return i;
		if (first < 0 || rcmp(v.end, (lanes[first] as Voice).end) < 0) first = i;
	}
	if (first < 0) throw new Error(`voices("stable"): more notes begin together than its ${lanes.length} lanes`);
	return first;
}
