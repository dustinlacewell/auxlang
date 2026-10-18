/**
 * Which pattern-token ranges are lit right now (live pattern highlight,
 * MANIFESTO §10.2/§10.3). Events (live-contract.ts ONSET_*) name a seq watch,
 * the lane the note came from (one lane per stacked chord note), an ON/OFF
 * kind, the ON's source site, and the engine sample frame it happens at; this
 * file turns the events seen so far into the set of ranges lit at `now`,
 * timed to `audibleFrame()` so the light matches the sound leaving the
 * speakers.
 *
 * Per (watch, lane) — one per stacked chord note — the most recent event
 * whose frame is <= audibleFrame() decides: ON lights its site, plus its
 * tie/extend chain (site-ranges.ts) — so `c3 ~ e3 _` lights c3, then nothing
 * for the rest, then e3 and the following `_` together (the seq's gate stays
 * high through a tie, so no OFF lands between them); OFF lights nothing — a
 * rest, or a chord lane whose note ended, goes dark. The seq's own ~1 ms
 * pre-release dip before a retrigger emits an OFF immediately followed by an
 * ON; both carry real frames, so by the time either is drawn the later one
 * (the ON) already wins — no separate debounce needed.
 */

import { onsetLaneKey } from "./onset-lane-key";
import type { SiteRanges } from "./site-ranges";

export type OnsetKind = "on" | "off";

export interface Onset {
	readonly watch: number;
	readonly lane: number;
	readonly kind: OnsetKind;
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
		if (onset.kind === "off") continue;
		lit.add(onset.site);
		for (const extra of siteRanges.extendersOf(onset.site)) lit.add(extra);
	}
	return lit;
}

/** For each (watch, lane), the event with the greatest frame not after `audibleFrame`. */
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
