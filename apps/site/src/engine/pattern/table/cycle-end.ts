/**
 * What one cycle's own events say about the carry after it (MANIFESTO §4.3),
 * shared by the look-back (lookback-carry.ts) and the step forward
 * (carry-forward.ts):
 *
 *   lastValue   the value of the cycle's last note or slide; null when it has
 *               none (rests and ties have no value of their own)
 *   lastField   the same for one record field: the last note or slide that
 *               carries it
 *   noteAtEnd   the note in force at the cycle's end: NO_NOTE after a rest or
 *               a gap; a tie is followed back to its note; TIED_IN when the
 *               tie reaches back to the cycle's start, so the note comes from
 *               the cycle before
 */

import type { Ev } from "../event";
import { r, rlt } from "../rational";
import { NO_NOTE } from "./event-table";
import { ownNoteId } from "./note-id";

/** noteAtEnd's answer when the cycle opens on a tie: the note in force comes from before it. */
export const TIED_IN = null;

const ownsValue = (ev: Ev): boolean => ev.kind === "note" || ev.kind === "slide";

export function lastValue(evs: readonly Ev[]): number | null {
	for (let i = evs.length - 1; i >= 0; i--) {
		const ev = evs[i] as Ev;
		if (ownsValue(ev)) return ev.value;
	}
	return null;
}

/** Record field `name` of the cycle's last note or slide that carries it; null when none does. */
export function lastField(evs: readonly Ev[], name: string): number | null {
	for (let i = evs.length - 1; i >= 0; i--) {
		const ev = evs[i] as Ev;
		const value = ev.fields?.[name];
		if (value !== undefined && ownsValue(ev)) return value;
	}
	return null;
}

/** `evs` are cycle `cycle`'s events, sorted by onset. */
export function noteAtEnd(evs: readonly Ev[], cycle: number): number | typeof TIED_IN {
	let j = evs.length - 1;
	const last = evs[j];
	if (last === undefined || rlt(last.part.end, r(cycle + 1))) return NO_NOTE;
	while (true) {
		const ev = evs[j] as Ev;
		if (ev.kind === "rest") return NO_NOTE;
		if (ev.kind !== "tie") return ownNoteId(ev);
		const before = evs[j - 1];
		if (before === undefined) return rlt(r(cycle), ev.part.begin) ? NO_NOTE : TIED_IN;
		if (rlt(before.part.end, ev.part.begin)) return NO_NOTE;
		j--;
	}
}
