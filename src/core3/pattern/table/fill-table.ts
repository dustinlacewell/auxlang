/**
 * fillTable — build lane `lane` of cycle `c` into `t`: the cycle's events as
 * contiguous rows with rest rows in the gaps, the carry from before the
 * cycle, and the gate-dip marks (peeking the next cycle's first row for the
 * last one). The only bridge code that queries a pattern.
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { rtof } from "../rational";
import { carryBefore } from "./carry-before";
import { type EventTable, KIND_NOTE, KIND_REST, NO_NOTE, ensureCapacity, sounds } from "./event-table";
import { laneCycle } from "./lane-cycle";
import { type RowKind, rowKind, setsValue } from "./row-kind";

export function fillTable(pat: Pat, seed: number, lane: number, c: number, t: EventTable): void {
	const carry = carryBefore(pat, seed, lane, c);
	const inForceAtEnd = writeRows(laneCycle(pat, seed, lane, c), c, carry.value, carry.noteId, t);
	markDips(t, nextHead(pat, seed, lane, c + 1, inForceAtEnd));
	t.cycle = c;
	t.carryValue = carry.value;
	t.carryNoteId = carry.noteId;
}

const GAP: RowKind = { kind: KIND_REST, noteId: NO_NOTE, slideFrom: NO_NOTE };

/**
 * Rows for one cycle's sorted events: each event runs until the next one
 * begins (or its part ends); gaps become rest rows. Rest and tie rows hold the
 * value before them. Returns the note in force at the cycle's end (NO_NOTE
 * after a rest or a gap), for the next cycle's ties and slides.
 */
function writeRows(
	evs: readonly Ev[],
	c: number,
	heldValue: number,
	noteBefore: number,
	t: EventTable,
): number {
	ensureCapacity(t, 2 * evs.length + 1);
	t.count = 0;
	let cursor = c;
	let held = heldValue;
	let inForce = noteBefore;
	for (let i = 0; i < evs.length; i++) {
		const ev = evs[i] as Ev;
		const begin = rtof(ev.part.begin);
		const next = evs[i + 1];
		const end = Math.min(rtof(ev.part.end), next === undefined ? c + 1 : rtof(next.part.begin));
		if (begin > cursor) {
			pushRow(t, cursor, begin, held, GAP);
			inForce = NO_NOTE;
		}
		const row = rowKind(ev, inForce);
		if (setsValue(row)) held = ev.value;
		if (end > begin) pushRow(t, begin, end, held, row);
		inForce = row.noteId;
		cursor = Math.max(cursor, end);
	}
	if (cursor < c + 1) {
		pushRow(t, cursor, c + 1, held, GAP);
		inForce = NO_NOTE;
	}
	return inForce;
}

function pushRow(t: EventTable, begin: number, end: number, value: number, row: RowKind): void {
	const i = t.count;
	t.begin[i] = begin;
	t.end[i] = end;
	t.value[i] = value;
	t.kind[i] = row.kind;
	t.noteId[i] = row.noteId;
	t.slideFrom[i] = row.slideFrom;
	t.dipBefore[i] = 0;
	t.count = i + 1;
}

/** The first row of cycle `c`: a rest when nothing starts at its very beginning. */
function nextHead(pat: Pat, seed: number, lane: number, c: number, inForce: number): RowKind {
	const first = laneCycle(pat, seed, lane, c)[0];
	if (first === undefined || rtof(first.part.begin) > c) return GAP;
	return rowKind(first, inForce);
}

/**
 * A sounding row dips before a touching note of a different note id. Ties and
 * slides entered from this row continue without a dip.
 */
function markDips(t: EventTable, head: RowKind): void {
	for (let i = 0; i < t.count; i++) {
		const last = i === t.count - 1;
		const nextKind = last ? head.kind : (t.kind[i + 1] as number);
		const nextNote = last ? head.noteId : (t.noteId[i + 1] as number);
		const dips =
			sounds(t.kind[i] as number) && nextKind === KIND_NOTE && nextNote !== (t.noteId[i] as number);
		t.dipBefore[i] = dips ? 1 : 0;
	}
}
