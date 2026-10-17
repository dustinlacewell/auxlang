/**
 * Which pattern-token ranges are lit right now (live pattern highlight,
 * MANIFESTO §10.2/§10.3). Onsets (live-contract.ts ONSET_*) name a seq watch,
 * the lane the note came from (one lane per stacked chord note), the event's
 * source site and the engine sample frame it starts at; this file turns the
 * onsets seen so far into the set of ranges lit at `now`, timed to
 * `audibleFrame()` so the light matches the sound leaving the speakers.
 *
 * Per (watch, lane) — one per stacked chord note — the most recent onset
 * whose frame is <= audibleFrame() is "current"; its own range lights, plus
 * its tie/extend chain (site-ranges.ts) — so `c3 ~ e3 _` lights c3, then
 * nothing for the rest, then e3 and the following `_` together. A rest has
 * no onset, so a lane's last note stays lit (latched) rather than going dark
 * when a chord shrinks to fewer notes; the engine does not yet report a
 * lane's rest/release cheaply (see held-onsets.ts).
 */

import { onsetLaneKey } from "./onset-lane-key";
import type { SiteRanges } from "./site-ranges";

export interface Onset {
	readonly watch: number;
	readonly lane: number;
	readonly site: number;
	readonly frame: number;
}

/** Lit ranges, keyed by site id, deduped. `now` is wall-clock ms (unused by the pure rule; kept for API symmetry with glow-state's per-watch clocks). */
export function onsetsToLights(
	onsets: readonly Onset[],
	siteRanges: SiteRanges,
	audibleFrame: number,
	_now: number,
): ReadonlySet<number> {
	const current = latestPerLane(onsets, audibleFrame);
	const lit = new Set<number>();
	for (const onset of current.values()) {
		lit.add(onset.site);
		for (const extra of siteRanges.extendersOf(onset.site)) lit.add(extra);
	}
	return lit;
}

/** For each (watch, lane), the onset with the greatest frame not after `audibleFrame`. */
function latestPerLane(onsets: readonly Onset[], audibleFrame: number): Map<string, Onset> {
	const latest = new Map<string, Onset>();
	for (const onset of onsets) {
		if (onset.frame > audibleFrame) continue;
		const key = onsetLaneKey(onset);
		const held = latest.get(key);
		if (held === undefined || onset.frame > held.frame) latest.set(key, onset);
	}
	return latest;
}
