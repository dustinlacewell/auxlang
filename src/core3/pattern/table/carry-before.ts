/**
 * What a lane holds before cycle `c` (MANIFESTO §4.3):
 *
 *   value   the value of the most recent earlier note or slide; rests and
 *           ties have no value of their own, so they are passed over
 *   noteId  the note in force at the end of cycle c - 1: NO_NOTE when that
 *           cycle ends in a rest or a gap; a tie there is followed back to
 *           its note
 *
 * Both look back one period: if a period holds no note, none came earlier.
 * When randomness picks the rests (`degrade`, `?`), the last note may lie
 * further back than one period, so the look-back is at least
 * RANDOM_LOOKBACK_CYCLES. Nothing found holds value 0 and no note (NO_NOTE).
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { period } from "../period";
import { hasRandomKinds } from "../random-kinds";
import { r, rlt } from "../rational";
import { NO_NOTE } from "./event-table";
import { laneCycle } from "./lane-cycle";
import { ownNoteId } from "./note-id";

export const RANDOM_LOOKBACK_CYCLES = 16;

export interface Carry {
	readonly value: number;
	readonly noteId: number;
}

export function carryBefore(pat: Pat, seed: number, lane: number, c: number): Carry {
	const at = { pat, seed, lane };
	const depth = lookback(pat);
	return { value: valueBefore(at, c, depth), noteId: noteAtStart(at, c, depth) };
}

function lookback(pat: Pat): number {
	const cycles = period(pat);
	if (cycles !== null && !hasRandomKinds(pat)) return cycles;
	return Math.max(cycles ?? 0, RANDOM_LOOKBACK_CYCLES);
}

interface Lane {
	readonly pat: Pat;
	readonly seed: number;
	readonly lane: number;
}

const cycleOf = (at: Lane, c: number): Ev[] => laneCycle(at.pat, at.seed, at.lane, c);

const ownsValue = (ev: Ev): boolean => ev.kind === "note" || ev.kind === "slide";

/** The value of the last note or slide before cycle `c`, looking back `depth` cycles. */
function valueBefore(at: Lane, c: number, depth: number): number {
	for (let k = 1; k <= depth; k++) {
		const evs = cycleOf(at, c - k);
		for (let i = evs.length - 1; i >= 0; i--) {
			const ev = evs[i] as Ev;
			if (ownsValue(ev)) return ev.value;
		}
	}
	return 0;
}

/** The note in force where cycle `c` starts: the end of cycle `c - 1`. */
function noteAtStart(at: Lane, c: number, depth: number): number {
	if (depth <= 0) return NO_NOTE;
	const evs = cycleOf(at, c - 1);
	let j = evs.length - 1;
	const last = evs[j];
	if (last === undefined || rlt(last.part.end, r(c))) return NO_NOTE;
	while (true) {
		const ev = evs[j] as Ev;
		if (ev.kind === "rest") return NO_NOTE;
		if (ev.kind !== "tie") return ownNoteId(ev);
		const before = evs[j - 1];
		if (before === undefined) {
			return rlt(r(c - 1), ev.part.begin) ? NO_NOTE : noteAtStart(at, c - 1, depth - 1);
		}
		if (rlt(before.part.end, ev.part.begin)) return NO_NOTE;
		j--;
	}
}
