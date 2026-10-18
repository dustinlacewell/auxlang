/**
 * The look-back carry before cycle `c` (MANIFESTO §4.3), for lanes that are
 * not read from a voices history (carry-before.ts):
 *
 *   value   the value of the most recent earlier note or slide
 *   noteId  the note in force at the end of cycle c - 1, a tie followed back
 *           to its note
 *   fields  each record field's value from the most recent earlier note or
 *           slide that carries it
 *
 * Packed lanes are structural, so both look back one period: if a period
 * holds no note, none came earlier. When randomness picks the rests
 * (`degrade`, `?`), the last note may lie further back than one period, so the
 * look-back is at least RANDOM_LOOKBACK_CYCLES. Nothing found holds value 0
 * and no note (NO_NOTE).
 *
 * The trace also says where in the window each was found, so a fill of the
 * next cycle can step the carry on instead of looking back (carry-forward.ts):
 *
 *   valueAge   how many cycles back the value's note lies (1: cycle c - 1);
 *              NONE when the window holds no note (fieldAges: the same per field)
 *   noteChain  how many whole cycles of tie the note look-back crossed before
 *              it ended; NONE when it ran out of depth
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { period } from "../period";
import { hasRandomKinds } from "../random-kinds";
import { recordFields } from "../record-fields";
import { TIED_IN, lastField, lastValue, noteAtEnd } from "./cycle-end";
import { NO_NOTE } from "./event-table";

export const RANDOM_LOOKBACK_CYCLES = 16;

/** An age or chain that is not in the window. */
export const NONE = Number.POSITIVE_INFINITY;

/** A lane's events in one cycle (lane-cycle.ts, or a memo of it). */
export type LaneCycles = (cycle: number) => readonly Ev[];

export interface CarryTrace {
	readonly value: number;
	readonly noteId: number;
	readonly valueAge: number;
	readonly noteChain: number;
	/** Each record field's held value (recordFields order), found as `value` is. */
	readonly fields: readonly number[];
	readonly fieldAges: readonly number[];
}

export function lookbackCarry(pat: Pat, cycles: LaneCycles, c: number): CarryTrace {
	const depth = lookbackDepth(pat);
	const held = heldBefore(cycles, c, depth, lastValue);
	const note = noteAtStart(cycles, c, depth);
	const fields = recordFields(pat).map((name) =>
		heldBefore(cycles, c, depth, (evs) => lastField(evs, name)),
	);
	return {
		value: held.value,
		valueAge: held.age,
		noteId: note.noteId,
		noteChain: note.chain,
		fields: fields.map((f) => f.value),
		fieldAges: fields.map((f) => f.age),
	};
}

/** How many cycles the look-back reads. */
export function lookbackDepth(pat: Pat): number {
	const cycles = period(pat);
	if (cycles !== null && !hasRandomKinds(pat)) return cycles;
	return Math.max(cycles ?? 0, RANDOM_LOOKBACK_CYCLES);
}

export interface Held {
	readonly value: number;
	readonly age: number;
}

export interface InForce {
	readonly noteId: number;
	readonly chain: number;
}

export const NOTHING_HELD: Held = { value: 0, age: NONE };
export const OUT_OF_DEPTH: InForce = { noteId: NO_NOTE, chain: NONE };

/** What `last` reads off the latest cycle before `c` that has it, looking back `depth` cycles. */
function heldBefore(
	cycles: LaneCycles,
	c: number,
	depth: number,
	last: (evs: readonly Ev[]) => number | null,
): Held {
	for (let k = 1; k <= depth; k++) {
		const value = last(cycles(c - k));
		if (value !== null) return { value, age: k };
	}
	return NOTHING_HELD;
}

/** The note in force where cycle `c` starts: the end of cycle `c - 1`. */
function noteAtStart(cycles: LaneCycles, c: number, depth: number): InForce {
	if (depth <= 0) return OUT_OF_DEPTH;
	const noteId = noteAtEnd(cycles(c - 1), c - 1);
	if (noteId !== TIED_IN) return { noteId, chain: 0 };
	const before = noteAtStart(cycles, c - 1, depth - 1);
	return { noteId: before.noteId, chain: before.chain + 1 };
}
