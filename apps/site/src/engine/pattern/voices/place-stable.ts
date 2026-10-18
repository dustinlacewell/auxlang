/**
 * `stable` placement. A note with the value of a voice that ends right where
 * it begins is a common tone held across a change: it takes that voice's
 * lane. The other notes take the lowest free lanes, in child-lane order.
 *
 * Lanes follow the events as they play, and no child lane holds two notes at
 * once, so with n at least the structural width a free lane always exists.
 * None free means the child broke that rule: a loud error, never a steal.
 */

import type { Ev } from "../event";
import { type R, req, rlte, rtof } from "../rational";
import type { Place } from "./assign-cycle";
import type { Voice } from "./voice-state";

export const placeStable: Place = (lanes, notes, t) => {
	const taken = new Set<number>();
	const held = notes.map((ev) => claim(taken, heldLane(lanes, ev, t, taken)));
	return held.map((lane) => lane ?? (claim(taken, freeLane(lanes, t, taken)) as number));
};

function claim(taken: Set<number>, lane: number | undefined): number | undefined {
	if (lane !== undefined) taken.add(lane);
	return lane;
}

/** The lane of an untaken voice that ends at `t` with the note's value. */
function heldLane(
	lanes: readonly (Voice | null)[],
	ev: Ev,
	t: R,
	taken: ReadonlySet<number>,
): number | undefined {
	const lane = lanes.findIndex((v, i) => !taken.has(i) && v !== null && req(v.end, t) && v.value === ev.value);
	return lane < 0 ? undefined : lane;
}

/** The lowest untaken lane free at `t`. */
function freeLane(lanes: readonly (Voice | null)[], t: R, taken: ReadonlySet<number>): number {
	const lane = lanes.findIndex((v, i) => !taken.has(i) && (v === null || rlte(v.end, t)));
	if (lane < 0) {
		throw new Error(
			`voices("stable", ${lanes.length}): no free lane at position ${rtof(t)}; more notes sound at once than the pattern's structural width`,
		);
	}
	return lane;
}
