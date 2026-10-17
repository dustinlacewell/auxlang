/**
 * The ON/OFF events the pattern highlight still needs, carried from one
 * monitor frame to the next. A frame carries only the events the engine
 * rendered since the last one (frame-store.ts); the sound reaches the
 * speakers an output latency later, so an event must wait across frames
 * until `audibleFrame` reaches it. Kept: every event still in the future,
 * and per (watch, lane) the latest one already audible — whichever kind, ON
 * or OFF, since that is what decides whether the lane is lit right now
 * (onsets-to-lights.ts). Older events are dropped, so the list stays a few
 * entries long.
 */

import { onsetLaneKey } from "./onset-lane-key";
import type { Onset } from "./onsets-to-lights";

export function heldOnsets(
	held: readonly Onset[],
	fresh: readonly Onset[],
	audibleFrame: number,
): Onset[] {
	const all = [...held, ...fresh];
	const current = new Map<string, Onset>();
	for (const onset of all) {
		if (onset.frame > audibleFrame) continue;
		const key = onsetLaneKey(onset);
		const prior = current.get(key);
		if (prior === undefined || onset.frame > prior.frame) current.set(key, onset);
	}
	return all.filter((onset) => onset.frame > audibleFrame || current.get(onsetLaneKey(onset)) === onset);
}
