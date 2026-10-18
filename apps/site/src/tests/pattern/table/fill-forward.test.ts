/**
 * A lane's fills through its LaneFill (the carry stepped forward, the dip
 * peek kept, queries shared by the node's lanes) give the same tables as a
 * fresh look-back fill of each cycle: in order, across a seek, past the
 * look-back window's cap (rest stretches longer than it, a tie chain that
 * runs out of depth), for random kinds, ties, slides and every voices
 * policy, and for every seq of the coastline example.
 */

import { describe, expect, it } from "vitest";

import "auxlang/library/all";
import type { Pat } from "auxlang/pattern/ast";
import { parse } from "auxlang/pattern/notation/parse";
import { p } from "auxlang/pattern/notation/template";
import { CycleQueries } from "auxlang/pattern/table/cycle-queries";
import { type EventTable, KIND_NOTE, createTable } from "auxlang/pattern/table/event-table";
import { fillTable } from "auxlang/pattern/table/fill-table";
import { LaneFill } from "auxlang/pattern/table/lane-fill";
import { RANDOM_LOOKBACK_CYCLES } from "auxlang/pattern/table/lookback-carry";
import { EXAMPLES } from "@/ui/editor/examples/examples";
import { evalPatch } from "auxlang/eval-patch";

const SEED = 7;
const CYCLES = 40;

function snapshot(t: EventTable) {
	const rows = <A extends { subarray(a: number, b: number): ArrayLike<number> }>(a: A) =>
		Array.from(a.subarray(0, t.count));
	return {
		cycle: t.cycle,
		carryValue: t.carryValue,
		carryNoteId: t.carryNoteId,
		begin: rows(t.begin),
		end: rows(t.end),
		value: rows(t.value),
		kind: rows(t.kind),
		noteId: rows(t.noteId),
		slideFrom: rows(t.slideFrom),
		dipBefore: rows(t.dipBefore),
	};
}

/** A fresh look-back fill of one cycle. */
function fresh(pat: Pat, lane: number, c: number, seed = SEED) {
	const t = createTable(1);
	fillTable(pat, seed, lane, c, t);
	return snapshot(t);
}

/** Fill `cycles` in the given order through one LaneFill per lane (lanes share queries), each against a fresh fill. */
function expectSameAsFresh(pat: Pat, lanes: number, cycles: readonly number[], seed = SEED): void {
	const queries = new CycleQueries();
	const fills = Array.from({ length: lanes }, () => ({
		fill: new LaneFill(queries),
		t: createTable(1),
	}));
	for (const c of cycles) {
		fills.forEach(({ fill, t }, lane) => {
			fillTable(pat, seed, lane, c, t, fill);
			expect(snapshot(t), `lane ${lane} cycle ${c}`).toEqual(fresh(pat, lane, c, seed));
		});
	}
}

const inOrder = (from: number, count: number) => Array.from({ length: count }, (_, k) => from + k);

const CASES: readonly (readonly [string, Pat, number])[] = [
	["plain", p`c4 e4 g4 b4`.ast, 1],
	["rarely ply", p`[0 <4 3 <2 5>>*2]`.euclid(4, 8).rarely((q) => q.ply(2)).ast, 1],
	["degrade", p`c4 e4 [g4 b4] ~`.degrade(0.6).ast, 1],
	["maybe", p`c4? e4?0.8 ~ g4?0.3`.ast, 1],
	["ties", p`c4 _ _ e4 <g4 _> ~`.ast, 1],
	["ties over cycles", p`<c4 _ _ ~ e4 _>`.ast, 1],
	["tie chain at the cap", parse(`<c4 ${"_ ".repeat(19)}>`), 1],
	["random tie chain", parse(`<c4? ${"_ ".repeat(20)}>`), 1],
	["ties only", { op: "tie", lanes: 1 }, 1],
	["ties only, then notes", p`<${{ op: "tie", lanes: 1 }} c4>`.slow(20).ast, 1],
	["slides", p`c4_e4 ~ g4_a4 <b4_c5 ~>`.ast, 1],
	["random slides", p`c4_e4? g4?_a4`.ast, 1],
	["packed", p`[c4, e4, g4] <[d4, f4] ~ [a4, c5, e5]>?`.voices("packed", 3).ast, 3],
	["stable", p`<[c4, e4, g4] [c4, f4] ~ [e4, g4, b4]>?`.voices("stable", 3).ast, 3],
	["rr", p`c4 e4? ~ g4 <b4 ~>`.voices("rr", 3).ast, 3],
	["chunk fast", p`c4 e4 g4 ~`.chunk(4, (q) => q.fast(2)).rarely((q) => q.ply(2)).ast, 1],
];

describe("LaneFill: fills stepped forward equal fresh look-back fills", () => {
	for (const [name, pat, lanes] of CASES) {
		it(`${name}: ${CYCLES} cycles in order`, () => {
			expectSameAsFresh(pat, lanes, inOrder(0, CYCLES));
		});
		it(`${name}: seeks forward, back and to negative cycles`, () => {
			expectSameAsFresh(pat, lanes, [...inOrder(3, 6), 30, 31, 32, 2, 3, 4, 4, 17, -5, -4, -3, 0]);
		});
	}

	it("a rest stretch longer than the look-back drops the held value as the look-back does", () => {
		const pat = p`c4?0.92`.ast;
		const seed = longGapSeed(pat);
		expectSameAsFresh(pat, 1, inOrder(0, 120), seed);
	});

	it("a lane read at another lane's cycles, in any order, shares its queries", () => {
		const pat = p`[c4, e4] <g4 [a4, b4]?>`.voices("packed", 2).ast;
		const queries = new CycleQueries();
		const fills = [new LaneFill(queries), new LaneFill(queries)];
		const tables = [createTable(1), createTable(1)];
		/** [lane, cycle] in fill order: lanes take turns, sometimes twice running. */
		const visits = [
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
			[0, 2],
			[0, 3],
			[1, 2],
			[1, 3],
		] as const;
		for (const [lane, c] of visits) {
			fillTable(pat, SEED, lane, c, tables[lane] as EventTable, fills[lane]);
			expect(snapshot(tables[lane] as EventTable)).toEqual(fresh(pat, lane, c));
		}
	});

	it("every seq of the coastline example", () => {
		const source = EXAMPLES.find((e) => e.name.startsWith("coastline"))?.source ?? "";
		const program = evalPatch(source);
		const seqs = program.nodes.filter((node) => node.config.pattern !== undefined);
		expect(seqs.length).toBeGreaterThan(0);
		for (const node of seqs) {
			const pat = node.config.pattern as Pat;
			const lanes = (node.config.lanes as number) | 0 || 1;
			expectSameAsFresh(pat, lanes, inOrder(0, CYCLES), (node.config.seed as number) | 0);
		}
	});
});

/** A seed under which the pattern's one note is missing for longer than the look-back window. */
function longGapSeed(pat: Pat): number {
	for (let seed = 0; seed < 200; seed++) {
		let gap = 0;
		for (let c = 0; c < 120; c++) {
			const t = createTable(1);
			fillTable(pat, seed, 0, c, t);
			const sounds = Array.from(t.kind.subarray(0, t.count)).includes(KIND_NOTE);
			gap = sounds ? 0 : gap + 1;
			if (gap > RANDOM_LOOKBACK_CYCLES + 2 && c > 30) return seed;
		}
	}
	throw new Error("no seed leaves a rest stretch longer than the look-back");
}
