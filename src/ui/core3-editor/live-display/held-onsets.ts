/**
 * The onsets the pattern highlight still needs, carried from one monitor
 * frame to the next. A frame carries only the onsets the engine rendered
 * since the last one (frame-store.ts); the sound reaches the speakers an
 * output latency later, so an onset must wait across frames until
 * `audibleFrame` reaches it. Kept: every onset still in the future, and per
 * watch the latest one already audible (the note lit now). Older onsets are
 * dropped, so the list stays a few entries long.
 */

import type { Onset } from "./onsets-to-lights";

export function heldOnsets(
	held: readonly Onset[],
	fresh: readonly Onset[],
	audibleFrame: number,
): Onset[] {
	const all = [...held, ...fresh];
	const current = new Map<number, Onset>();
	for (const onset of all) {
		if (onset.frame > audibleFrame) continue;
		const prior = current.get(onset.watch);
		if (prior === undefined || onset.frame > prior.frame) current.set(onset.watch, onset);
	}
	return all.filter((onset) => onset.frame > audibleFrame || current.get(onset.watch) === onset);
}
