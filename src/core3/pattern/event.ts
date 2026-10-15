/**
 * Pattern events. Tidal's hap model: `whole` is the event's full extent,
 * `part` the fragment inside the queried span. An event STARTS where
 * whole !== null && req(whole.begin, part.begin).
 *
 * `kind` (MANIFESTO §3.1): a `note` sounds; a `rest` is a step with its gate
 * off; a `tie` continues the previous note (no value of its own); a `slide`
 * is a new note entered without a retrigger.
 */

import type { R } from "./rational";
import { req } from "./rational";

export interface Span {
	readonly begin: R;
	readonly end: R;
}

export type EvKind = "note" | "rest" | "tie" | "slide";

export interface Ev {
	readonly whole: Span | null;
	readonly part: Span;
	readonly value: number;
	readonly kind: EvKind;
	/** Voice lane, fixed by pattern structure (absent = lane 0). See `laneOf`. */
	readonly lane?: number;
	/** The site of the token that made this event, when it was written in the code (Pat leaves). */
	readonly site?: number;
}

/** The event begins inside this fragment (any kind: rests and ties start steps too). */
export const startsHere = (e: Ev): boolean => e.whole !== null && req(e.whole.begin, e.part.begin);

/** A new note begins here: a starting note or slide. */
export const isOnset = (e: Ev): boolean =>
	startsHere(e) && (e.kind === "note" || e.kind === "slide");

export const laneOf = (e: Ev): number => e.lane ?? 0;
