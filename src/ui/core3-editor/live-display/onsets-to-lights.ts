/**
 * Which pattern-token ranges are lit right now (live pattern highlight,
 * MANIFESTO §10.2/§10.3). Onsets (live-contract.ts ONSET_*) name a seq watch,
 * the event's source site and the engine sample frame it starts at; this file
 * turns the onsets seen so far into the set of ranges lit at `now`, timed to
 * `audibleFrame()` so the light matches the sound leaving the speakers.
 *
 * Per watch (one seq), the most recent onset whose frame is <= audibleFrame()
 * is "current"; its own range lights, plus its tie/extend chain
 * (site-ranges.ts) — so `c3 ~ e3 _` lights c3, then nothing for the rest,
 * then e3 and the following `_` together. A rest has no onset, so it is never
 * lit. An onset in the future (frame > audibleFrame()) is not yet lit.
 */

import type { SiteRanges } from "./site-ranges";

export interface Onset {
	readonly watch: number;
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
	const current = latestPerWatch(onsets, audibleFrame);
	const lit = new Set<number>();
	for (const onset of current.values()) {
		lit.add(onset.site);
		for (const extra of siteRanges.extendersOf(onset.site)) lit.add(extra);
	}
	return lit;
}

/** For each watch, the onset with the greatest frame not after `audibleFrame`. */
function latestPerWatch(onsets: readonly Onset[], audibleFrame: number): Map<number, Onset> {
	const latest = new Map<number, Onset>();
	for (const onset of onsets) {
		if (onset.frame > audibleFrame) continue;
		const held = latest.get(onset.watch);
		if (held === undefined || onset.frame > held.frame) latest.set(onset.watch, onset);
	}
	return latest;
}
