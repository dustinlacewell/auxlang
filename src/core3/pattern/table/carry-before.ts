/**
 * What a lane holds before cycle `c`: the value and note of the most recent
 * earlier event (MANIFESTO §4.3). Looks back one cycle at a time, at most
 * LOOKBACK_CYCLES; a tie at the head of a found cycle looks further back for
 * its note. Nothing found holds value 0 and no note (NaN).
 *
 * The bound stands in for the pattern's period until `pattern/period.ts`
 * exists.
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { laneCycle } from "./lane-cycle";
import { noteIdOf } from "./note-id";

export const LOOKBACK_CYCLES = 16;

export interface Carry {
	readonly value: number;
	readonly noteId: number;
}

export const NO_CARRY: Carry = { value: 0, noteId: Number.NaN };

export function carryBefore(
	pat: Pat,
	seed: number,
	lane: number,
	c: number,
	depth = LOOKBACK_CYCLES,
): Carry {
	for (let k = 1; k <= depth; k++) {
		const evs = laneCycle(pat, seed, lane, c - k);
		if (evs.length === 0) continue;
		const last = evs[evs.length - 1] as Ev;
		const earlier = () => carryBefore(pat, seed, lane, c - k, depth - k).noteId;
		return { value: last.value, noteId: lastNoteId(evs, earlier) };
	}
	return NO_CARRY;
}

/** Note id of the last event, following ties back to their note. */
function lastNoteId(evs: readonly Ev[], earlier: () => number): number {
	let first = evs.length - 1;
	while (first >= 0 && (evs[first] as Ev).tiePrev === true) first--;
	if (first < 0) return earlier();
	return noteIdOf(evs[first] as Ev, Number.NaN);
}
