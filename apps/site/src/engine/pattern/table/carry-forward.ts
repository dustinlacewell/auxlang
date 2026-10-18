/**
 * carryAfter — the look-back carry into cycle c + 1, stepped on from the carry
 * into cycle c and cycle c's own events, with no look-back query. It gives
 * exactly what lookbackCarry(c + 1) gives, the window's cap included: a value
 * (or record field)
 * whose note falls out of the window is dropped, and a tie chain that runs
 * past the window's depth ends in NO_NOTE (lookback-carry.ts).
 */

import type { Ev } from "../event";
import { TIED_IN, lastField, lastValue, noteAtEnd } from "./cycle-end";
import {
	type CarryTrace,
	type Held,
	type InForce,
	NOTHING_HELD,
	OUT_OF_DEPTH,
} from "./lookback-carry";

export function carryAfter(
	before: CarryTrace,
	evs: readonly Ev[],
	c: number,
	depth: number,
	fieldNames: readonly string[],
): CarryTrace {
	const held = heldAfter({ value: before.value, age: before.valueAge }, lastValue(evs), depth);
	const note = noteAfter(before, evs, c, depth);
	const fields = fieldNames.map((name, k) =>
		heldAfter(
			{ value: before.fields[k] as number, age: before.fieldAges[k] as number },
			lastField(evs, name),
			depth,
		),
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

/** Cycle c's last value (`last`), else the earlier one a cycle older, while it stays in the window. */
function heldAfter(before: Held, last: number | null, depth: number): Held {
	if (depth < 1) return NOTHING_HELD;
	if (last !== null) return { value: last, age: 1 };
	const age = before.age + 1;
	return age <= depth ? { value: before.value, age } : NOTHING_HELD;
}

/** The note in force at cycle c's end; a tie back to its start continues the chain into c, while it stays in depth. */
function noteAfter(before: CarryTrace, evs: readonly Ev[], c: number, depth: number): InForce {
	if (depth <= 0) return OUT_OF_DEPTH;
	const noteId = noteAtEnd(evs, c);
	if (noteId !== TIED_IN) return { noteId, chain: 0 };
	const chain = before.noteChain + 1;
	return chain <= depth - 1 ? { noteId: before.noteId, chain } : OUT_OF_DEPTH;
}
