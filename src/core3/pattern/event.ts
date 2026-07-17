/**
 * Pattern events. Tidal's hap model: `whole` is the event's full extent,
 * `part` the fragment inside the queried span. An event is an ONSET
 * (attack, trig) iff whole !== null && req(whole.begin, part.begin).
 */

import type { R } from "./rational";
import { req } from "./rational";

export interface Span {
	readonly begin: R;
	readonly end: R;
}

export interface Ev {
	readonly whole: Span | null;
	readonly part: Span;
	readonly value: number;
	/** Gate continues through this event's end (no gap, no retrigger of next). */
	readonly tieNext?: boolean;
	/** This event continues a previous one (no onset/trig). */
	readonly tiePrev?: boolean;
}

export const isOnset = (e: Ev): boolean =>
	e.whole !== null && req(e.whole.begin, e.part.begin) && !e.tiePrev;
