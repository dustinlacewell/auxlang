/**
 * `stable` and `rr` voices over a span inside one cycle (§3.5): the cycle's
 * lanes come from the history fold, clipped to the span. `queryChild` reads
 * the child pattern; it is passed in so this module never imports the
 * interpreter.
 *
 * Before cycle 0 there is no history: those cycles use the packed lanes
 * (packed-lanes.ts).
 */

import type { Pat } from "../ast";
import type { Ev, Span } from "../event";
import { type R, r, rfloor, rlt, rmax, rmin } from "../rational";
import { type Place, assignCycle } from "./assign-cycle";
import { historyFor } from "./histories";
import { createHistory, historyCycle } from "./history";
import { packedLanes, seedState } from "./packed-lanes";
import { placeRr } from "./place-rr";
import { placeStable } from "./place-stable";

export type HistoryPolicy = "stable" | "rr";

const PLACE: Record<HistoryPolicy, Place> = { stable: placeStable, rr: placeRr };

export interface HistoryVoices {
	readonly node: Pat;
	readonly policy: HistoryPolicy;
	readonly n: number;
}

export function historyVoices(
	voices: HistoryVoices,
	span: Span,
	seed: number,
	path: number,
	queryChild: (span: Span) => Ev[],
): Ev[] {
	const c = rfloor(span.begin);
	if (c < 0) return packedLanes(queryChild(span), voices.n);
	const childCycle = (k: number): Ev[] => queryChild({ begin: r(k), end: r(k + 1) });
	const h = historyFor(voices.node, seed, path, () => createHistory(seedState(childCycle(-1), voices.n)));
	const place = PLACE[voices.policy];
	return clipTo(historyCycle(h, c, (state, k) => assignCycle(state, childCycle(k), place)), span);
}

/** The events' fragments inside `span` (a span inside their cycle). */
function clipTo(evs: readonly Ev[], span: Span): Ev[] {
	const out: Ev[] = [];
	for (const ev of evs) {
		const begin: R = rmax(ev.part.begin, span.begin);
		const end: R = rmin(ev.part.end, span.end);
		if (rlt(begin, end)) out.push({ ...ev, part: { begin, end } });
	}
	return out;
}
