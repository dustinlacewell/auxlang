/**
 * fillTable — build lane `lane` of cycle `c` into `t`: the cycle's events as
 * contiguous rows with rest rows in the gaps, the carry from before the
 * cycle, and the gate-dip marks (peeking the next cycle's first row for the
 * last one). The only bridge code that queries a pattern; it reads through
 * the lane's LaneFill, which remembers what the next cycle's fill can reuse
 * (a fresh one by default: every fill looks back).
 *
 * With `sites`, the table gets one more field column after the record
 * fields: each row's source site (pattern/event.ts `site`) on a note or
 * slide row that has one, else -1. The monitor reads it for onsets
 * (runtime/live/); without `sites` there is no such column.
 */

import type { Pat } from "../ast";
import type { Ev } from "../event";
import { rtof } from "../rational";
import { recordFields } from "../record-fields";
import type { Carry } from "./carry-before";
import { CycleQueries } from "./cycle-queries";
import {
	type EventTable,
	KIND_NOTE,
	KIND_REST,
	NO_NOTE,
	ensureCapacity,
	ensureFields,
	sounds,
} from "./event-table";
import { LaneFill } from "./lane-fill";
import { type RowKind, rowKind, setsValue } from "./row-kind";

export function fillTable(
	pat: Pat,
	seed: number,
	lane: number,
	c: number,
	t: EventTable,
	fill: LaneFill = new LaneFill(new CycleQueries()),
	sites = false,
): void {
	fill.bind(pat, seed, lane);
	const fieldNames = recordFields(pat);
	ensureFields(t, fieldNames.length + (sites ? 1 : 0));
	const carry = fill.carryInto(c);
	const evs = fill.laneCycle(c);
	const inForceAtEnd = writeRows(evs, c, carry, fieldNames, t, sites ? fieldNames.length : -1);
	fill.filled(c, evs);
	markDips(t, nextHead(fill.laneCycle(c + 1), c + 1, inForceAtEnd));
	t.cycle = c;
	t.carryValue = carry.value;
	t.carryNoteId = carry.noteId;
}

const GAP: RowKind = { kind: KIND_REST, noteId: NO_NOTE, slideFrom: NO_NOTE };

/**
 * Rows for one cycle's sorted events: each event runs until the next one
 * begins (or its part ends); gaps become rest rows. Rest and tie rows hold the
 * value and record fields before them; a note or slide without a field holds
 * that field too. Returns the note in force at the cycle's end (NO_NOTE after
 * a rest or a gap), for the next cycle's ties and slides. `siteColumn`: the
 * field column the rows' sites go in, -1 for none.
 */
function writeRows(
	evs: readonly Ev[],
	c: number,
	carry: Carry,
	fieldNames: readonly string[],
	t: EventTable,
	siteColumn: number,
): number {
	ensureCapacity(t, 2 * evs.length + 1);
	t.count = 0;
	let cursor = c;
	let held = carry.value;
	const fields = [...carry.fields];
	let inForce = carry.noteId;
	for (let i = 0; i < evs.length; i++) {
		const ev = evs[i] as Ev;
		const begin = rtof(ev.part.begin);
		const next = evs[i + 1];
		const end = Math.min(rtof(ev.part.end), next === undefined ? c + 1 : rtof(next.part.begin));
		if (begin > cursor) {
			pushRow(t, cursor, begin, held, fields, GAP);
			writeSite(t, siteColumn, -1);
			inForce = NO_NOTE;
		}
		const row = rowKind(ev, inForce);
		if (setsValue(row)) {
			held = ev.value;
			takeFields(fields, fieldNames, ev);
		}
		if (end > begin) {
			pushRow(t, begin, end, held, fields, row);
			writeSite(t, siteColumn, setsValue(row) ? (ev.site ?? -1) : -1);
		}
		inForce = row.noteId;
		cursor = Math.max(cursor, end);
	}
	if (cursor < c + 1) {
		pushRow(t, cursor, c + 1, held, fields, GAP);
		writeSite(t, siteColumn, -1);
		inForce = NO_NOTE;
	}
	return inForce;
}

/** The last row's site, into the site column when the table has one. */
function writeSite(t: EventTable, siteColumn: number, site: number): void {
	if (siteColumn < 0) return;
	(t.fields[siteColumn] as Float64Array)[t.count - 1] = site;
}

/** The fields `ev` carries replace the held ones. */
function takeFields(held: number[], names: readonly string[], ev: Ev): void {
	if (ev.fields === undefined) return;
	for (let k = 0; k < names.length; k++) {
		const value = ev.fields[names[k] as string];
		if (value !== undefined) held[k] = value;
	}
}

function pushRow(
	t: EventTable,
	begin: number,
	end: number,
	value: number,
	fields: readonly number[],
	row: RowKind,
): void {
	const i = t.count;
	t.begin[i] = begin;
	t.end[i] = end;
	t.value[i] = value;
	t.kind[i] = row.kind;
	t.noteId[i] = row.noteId;
	t.slideFrom[i] = row.slideFrom;
	t.dipBefore[i] = 0;
	for (let k = 0; k < fields.length; k++) (t.fields[k] as Float64Array)[i] = fields[k] as number;
	t.count = i + 1;
}

/** The first row of cycle `c` (its events `evs`): a rest when nothing starts at its very beginning. */
function nextHead(evs: readonly Ev[], c: number, inForce: number): RowKind {
	const first = evs[0];
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
