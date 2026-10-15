/**
 * fillTable: one lane of one cycle as contiguous rows — events, rest rows in
 * the gaps, note ids (a tie keeps its note's; a slide has its own and records
 * the note it slides from), the carry from earlier cycles, and the dip marks
 * between touching notes (peeking the next cycle).
 */

import type { Pat } from "@/core3/pattern/ast";
import { slow, voices } from "@/core3/pattern/combinators";
import { p } from "@/core3/pattern/notation/template";
import { r } from "@/core3/pattern/rational";
import {
	type EventTable,
	KIND_NOTE,
	KIND_REST,
	KIND_SLIDE,
	KIND_TIE,
	NO_NOTE,
	createTable,
} from "@/core3/pattern/table/event-table";
import { fillTable } from "@/core3/pattern/table/fill-table";
import { describe, expect, it } from "vitest";

function table(pat: Pat, cycle: number, lane = 0): EventTable {
	const t = createTable(1);
	fillTable(pat, 0, lane, cycle, t);
	return t;
}

type RowField = Exclude<keyof EventTable, "cycle" | "count" | "carryValue" | "carryNoteId">;

const rows = (t: EventTable, field: RowField) => Array.from(t[field].subarray(0, t.count));

describe("fillTable", () => {
	it("lays four notes end to end, each with its own note id, dipping before the next", () => {
		const t = table(p`c4 e4 g4 b4`.ast, 0);
		expect(t.cycle).toBe(0);
		expect(rows(t, "begin")).toEqual([0, 0.25, 0.5, 0.75]);
		expect(rows(t, "end")).toEqual([0.25, 0.5, 0.75, 1]);
		expect(rows(t, "value")).toEqual([60, 64, 67, 71]);
		expect(rows(t, "kind")).toEqual([KIND_NOTE, KIND_NOTE, KIND_NOTE, KIND_NOTE]);
		expect(rows(t, "noteId")).toEqual([0, 0.25, 0.5, 0.75]);
		expect(rows(t, "dipBefore")).toEqual([1, 1, 1, 1]); // the last peeks next cycle's c4
	});

	it("uses absolute positions in later cycles", () => {
		const t = table(p`c4 e4`.ast, 3);
		expect(rows(t, "begin")).toEqual([3, 3.5]);
		expect(rows(t, "noteId")).toEqual([3, 3.5]);
	});

	it("fills gaps with rest rows that hold the value before them, with no dip into a rest", () => {
		const t = table(p`c4 ~ e4 ~`.ast, 1);
		expect(rows(t, "kind")).toEqual([KIND_NOTE, KIND_REST, KIND_NOTE, KIND_REST]);
		expect(rows(t, "value")).toEqual([60, 60, 64, 64]);
		expect(rows(t, "noteId")).toEqual([1, NO_NOTE, 1.5, NO_NOTE]);
		expect(rows(t, "dipBefore")).toEqual([0, 0, 0, 0]);
	});

	it("holds the most recent earlier event before the first one (knob carry, §4.3)", () => {
		const t = table(p`~ 800 ~ 400`.ast, 0);
		expect(t.carryValue).toBe(400);
		expect(t.carryNoteId).toBe(-0.25); // the 400 of cycle -1
		expect(rows(t, "value")).toEqual([400, 800, 800, 400]);
	});

	it("looks back across rest cycles for the carry value; a rest ends the note", () => {
		const t = table(p`<5 ~ ~>`.ast, 2);
		expect(t.carryValue).toBe(5);
		expect(t.carryNoteId).toBe(NO_NOTE);
		expect(rows(t, "value")).toEqual([5]);
	});

	it("holds 0 and no note when no event exists", () => {
		const t = table(p`~`.ast, 0);
		expect(t.count).toBe(1);
		expect(rows(t, "kind")).toEqual([KIND_REST]);
		expect(t.carryValue).toBe(0);
		expect(t.carryNoteId).toBe(NO_NOTE);
	});

	it("gives a tie its note's id and value, with no dip between them", () => {
		const t = table(p`c4 _ e4`.ast, 0);
		expect(rows(t, "kind")).toEqual([KIND_NOTE, KIND_TIE, KIND_NOTE]);
		expect(rows(t, "value")).toEqual([60, 60, 64]);
		expect(rows(t, "noteId")).toEqual([0, 0, 2 / 3]);
		expect(rows(t, "dipBefore")).toEqual([0, 1, 1]);
	});

	it("ties a chord in every lane", () => {
		const pat = voices("packed", undefined, p`[c4, e4] _`.ast);
		expect(rows(table(pat, 0, 1), "kind")).toEqual([KIND_NOTE, KIND_TIE]);
		expect(rows(table(pat, 0, 1), "value")).toEqual([64, 64]);
		expect(rows(table(pat, 0, 1), "noteId")).toEqual([0, 0]);
	});

	it("ties across the cycle edge to the note before", () => {
		const t = table(p`<c4 _>`.ast, 1);
		expect(rows(t, "kind")).toEqual([KIND_TIE]);
		expect(rows(t, "value")).toEqual([60]);
		expect(rows(t, "noteId")).toEqual([0]);
	});

	it("makes a tie after a rest a rest", () => {
		expect(rows(table(p`~ _ c4`.ast, 0), "kind")).toEqual([KIND_REST, KIND_REST, KIND_NOTE]);
	});

	it("gives a slide its own note id and the note it slides from, with no dip into it", () => {
		const t = table(p`c4_e4 g4`.ast, 0);
		expect(rows(t, "kind")).toEqual([KIND_NOTE, KIND_SLIDE, KIND_NOTE]);
		expect(rows(t, "value")).toEqual([60, 64, 67]);
		expect(rows(t, "noteId")).toEqual([0, 0.25, 0.5]);
		expect(rows(t, "slideFrom")).toEqual([NO_NOTE, 0, NO_NOTE]);
		expect(rows(t, "dipBefore")).toEqual([0, 1, 1]);
	});

	it("makes a slide after a rest a note", () => {
		const t = table(p`~_c4`.ast, 0);
		expect(rows(t, "kind")).toEqual([KIND_REST, KIND_NOTE]);
		expect(rows(t, "slideFrom")).toEqual([NO_NOTE, NO_NOTE]);
	});

	it("keeps one note id for a note crossing the cycle edge, with no dip at the edge", () => {
		const pat = slow(r(2), p`c4`.ast);
		const first = table(pat, 0);
		const second = table(pat, 1);
		expect(rows(first, "noteId")).toEqual([0]);
		expect(rows(second, "noteId")).toEqual([0]);
		expect(rows(first, "dipBefore")).toEqual([0]);
		expect(rows(second, "dipBefore")).toEqual([1]); // the next c4 starts at 2
	});

	it("reads only its own lane", () => {
		const pat = voices("packed", undefined, p`[c4, e4] g4`.ast);
		expect(rows(table(pat, 0, 0), "value")).toEqual([60, 67]);
		expect(rows(table(pat, 0, 1), "kind")).toEqual([KIND_NOTE, KIND_REST]);
		expect(rows(table(pat, 0, 1), "value")).toEqual([64, 64]);
	});

	it("refills in place, growing the rows when needed", () => {
		const t = createTable(1);
		fillTable(p`c4`.ast, 0, 0, 0, t);
		fillTable(p`c4 e4 g4 b4 c5 e5`.ast, 0, 0, 0, t);
		expect(t.count).toBe(6);
		fillTable(p`c4 e4`.ast, 0, 0, 1, t);
		expect(t.cycle).toBe(1);
		expect(rows(t, "value")).toEqual([60, 64]);
	});
});
