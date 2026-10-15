/**
 * `stable` and `rr` voices (§3.5) read from their history: a cycle's events
 * with lanes, clipped to a span, and the lanes as a cycle begins. `queryChild`
 * reads the child pattern; it is passed in so this module never imports the
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
import { type FoldCycle, type History, createHistory, historyCycle, historyState } from "./history";
import { packedLanes, seedState } from "./packed-lanes";
import { placeRr } from "./place-rr";
import { placeStable } from "./place-stable";
import type { VoiceState } from "./voice-state";

export type HistoryPolicy = "stable" | "rr";

const PLACE: Record<HistoryPolicy, Place> = { stable: placeStable, rr: placeRr };

/** A `stable` or `rr` voices node, read at one seed and structural path. */
export interface HistoryRead {
	readonly node: Pat;
	readonly policy: HistoryPolicy;
	readonly n: number;
	readonly seed: number;
	readonly path: number;
	readonly queryChild: (span: Span) => Ev[];
}

/** The events with lanes inside `span` (a span inside one cycle). */
export function historyVoices(at: HistoryRead, span: Span): Ev[] {
	const c = rfloor(span.begin);
	if (c < 0) return packedLanes(at.queryChild(span), at.n);
	const { h, fold } = historyOf(at);
	return clipTo(historyCycle(h, c, fold), span);
}

/** The lanes as cycle `c` begins (c >= 0). */
export function voicesStateAt(at: HistoryRead, c: number): VoiceState {
	const { h, fold } = historyOf(at);
	return historyState(h, c, fold);
}

function historyOf(at: HistoryRead): { h: History; fold: FoldCycle } {
	const childCycle = (k: number): Ev[] => at.queryChild({ begin: r(k), end: r(k + 1) });
	const h = historyFor(at.node, at.seed, at.path, () => createHistory(seedState(childCycle(-1), at.n)));
	const place = PLACE[at.policy];
	return { h, fold: (state, k) => assignCycle(state, childCycle(k), k, place) };
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
