/**
 * `p.voices("stable")` and `p.voices("rr", n)` (§3.5): lanes that depend on
 * history, folded from cycle 0. Exact lanes per event for fixed progressions,
 * query-order independence, the packed lanes before cycle 0, and the cost of a
 * cold read far into the song.
 */

import { describe, expect, it } from "vitest";

import type { Pat } from "@/core3/pattern/ast";
import { stack, steps, voices } from "@/core3/pattern/combinators";
import { type Ev, laneOf } from "@/core3/pattern/event";
import { p } from "@/core3/pattern/notation/template";
import { rcmp } from "@/core3/pattern/rational";
import { width } from "@/core3/pattern/widths";
import { evKey, queryCycles } from "./helpers";

/** [value, lane] per event, by onset then value. */
function lanes(pat: Pat, from: number, to: number): number[][] {
	return byOnset(queryCycles(pat, from, to)).map((ev) => [ev.value, laneOf(ev)]);
}

/** [kind, lane] per event, by onset then lane. */
function kindLanes(pat: Pat, from: number, to: number): (string | number)[][] {
	return byOnset(queryCycles(pat, from, to)).map((ev) => [ev.kind, laneOf(ev)]);
}

const byOnset = (evs: readonly Ev[]): Ev[] =>
	[...evs].sort((a, b) => rcmp(a.part.begin, b.part.begin) || a.value - b.value || laneOf(a) - laneOf(b));

/** Every event of cycle `c`, exactly, with its lane. */
const cycleKeys = (pat: Pat, c: number): string[] =>
	byOnset(queryCycles(pat, c, c + 1)).map((ev) => `${evKey(ev)}@${laneOf(ev)}`);

describe("stable", () => {
	const progression = () => p`<[c4,e4,g4] [a3,c4,f4] [g3,b3,d4] [g3,c4,e4]>`.voices("stable").ast;

	it("a fixed progression gives the expected lane per event", () => {
		const pat = progression();
		expect(lanes(pat, 0, 1)).toEqual([[60, 0], [64, 1], [67, 2]]);
		// C4 is held across the change: it stays in lane 0; A3 and F4 fill the free lanes.
		expect(lanes(pat, 1, 2)).toEqual([[57, 1], [60, 0], [65, 2]]);
		// No common tone: lowest free lanes in stack order.
		expect(lanes(pat, 2, 3)).toEqual([[55, 0], [59, 1], [62, 2]]);
		// G3 is held in lane 0.
		expect(lanes(pat, 3, 4)).toEqual([[55, 0], [60, 1], [64, 2]]);
		// Back to the first chord: C4 and E4 are held in lanes 1 and 2, so G4 takes lane 0.
		expect(lanes(pat, 4, 5)).toEqual([[60, 1], [64, 2], [67, 0]]);
	});

	it("keeps a common tone held across a chord change at a cycle edge", () => {
		const pat = p`<[e4,g4,c5] [g4,c5,e5]>`.voices("stable").ast;
		expect(lanes(pat, 0, 1)).toEqual([[64, 0], [67, 1], [72, 2]]);
		expect(lanes(pat, 1, 2)).toEqual([[67, 1], [72, 2], [76, 0]]);
	});

	it("a note that crosses a cycle edge keeps its lane in the next cycle", () => {
		// Each chord lasts two cycles; E4 is held into the second chord.
		const pat = p`<[c4,e4] [e4,g4]>`.slow(2).voices("stable").ast;
		expect(lanes(pat, 2, 3)).toEqual([[64, 1], [67, 0]]);
		// Read cold: cycle 3 holds the second halves of those notes.
		expect(lanes(p`<[c4,e4] [e4,g4]>`.slow(2).voices("stable").ast, 3, 4)).toEqual([
			[64, 1],
			[67, 0],
		]);
	});

	it("a tie continues its note's lane", () => {
		// Cycle 1 moves the child's lane 0 (E4) to lane 1; cycle 2's ties follow.
		const pat = p`<[c4,e4] [e4,g4] _>`.voices("stable").ast;
		expect(lanes(pat, 1, 2)).toEqual([[64, 1], [67, 0]]);
		const ties = queryCycles(pat, 2, 3).filter((ev) => ev.kind === "tie");
		expect(ties.map((ev) => laneOf(ev)).sort()).toEqual([0, 1]);
	});

	it("n defaults to the structural width; an n below it is a loud error", () => {
		expect(width(p`[c4,e4,g4]`.voices("stable").ast)).toBe(3);
		expect(() => p`[c4,e4,g4]`.voices("stable", 2)).toThrow(/needs 3 lanes/);
	});
});

describe("rr", () => {
	it("each note onset takes the next lane, across cycle edges", () => {
		const pat = p`c4 e4 g4`.voices("rr", 4).ast;
		expect(lanes(pat, 0, 1)).toEqual([[60, 0], [64, 1], [67, 2]]);
		expect(lanes(pat, 1, 2)).toEqual([[60, 3], [64, 0], [67, 1]]);
		expect(lanes(pat, 2, 3)).toEqual([[60, 2], [64, 3], [67, 0]]);
	});

	it("a chord progression rotates by note", () => {
		const pat = p`<[c4,e4] [d4,f4,a4]>`.voices("rr", 4).ast;
		expect(lanes(pat, 0, 1)).toEqual([[60, 0], [64, 1]]);
		expect(lanes(pat, 1, 2)).toEqual([[62, 2], [65, 3], [69, 0]]);
		expect(lanes(pat, 2, 3)).toEqual([[60, 1], [64, 2]]);
	});

	it("rests take no lane; a tie continues its note's lane", () => {
		const pat = p`c4 _ ~ e4`.voices("rr", 3).ast;
		expect(kindLanes(pat, 0, 1)).toEqual([
			["note", 0],
			["tie", 0],
			["note", 1],
		]);
		expect(kindLanes(pat, 1, 2)).toEqual([
			["note", 2],
			["tie", 2],
			["note", 0],
		]);
	});

	it("read by steps, its lanes are one layer, so no event falls outside a layer", () => {
		// A top-level stack would be two step layers (lanes 0 and 1); rr moves events to lanes 2 and 3.
		const pat = steps(voices("rr", 4, stack([p`c4 e4 g4`.ast, p`c3`.ast])));
		expect(lanes(pat, 0, 1)).toEqual([[48, 1], [60, 0]]);
		expect(lanes(pat, 1, 2)).toEqual([[64, 2]]);
		expect(lanes(pat, 2, 3)).toEqual([[67, 3]]);
	});

	it("n is required, and may be below the structural width", () => {
		expect(() => p`c4 e4`.voices("rr")).toThrow(/n is required/);
		expect(width(p`[c4,e4,g4]`.voices("rr", 2).ast)).toBe(2);
		expect(width(p`c4`.voices("rr", 6).ast)).toBe(6);
	});
});

describe("history is a pure function of position", () => {
	const make = {
		stable: () => p`<[c4,e4,g4] [a3,c4,f4] [g3,b3,d4] [g3,c4,e4] [b3,d4,g4]>`.voices("stable").ast,
		rr: () => p`<[c4,e4] [d4,f4,a4]> g4`.voices("rr", 5).ast,
	};

	for (const [policy, build] of Object.entries(make)) {
		it(`${policy}: cycle 7 read first equals cycle 7 read after 0..6, and after 9..0`, () => {
			const cold = cycleKeys(build(), 7);
			const forward = build();
			for (let c = 0; c < 7; c++) cycleKeys(forward, c);
			const backward = build();
			for (let c = 9; c >= 0; c--) cycleKeys(backward, c);
			expect(cycleKeys(forward, 7)).toEqual(cold);
			expect(cycleKeys(backward, 7)).toEqual(cold);
		});
	}

	it("a sub-span read matches the same span of the whole cycle", () => {
		const whole = queryCycles(make.rr(), 3, 4).filter((ev) => rcmp(ev.part.begin, { n: 7, d: 2 }) >= 0);
		const half = queryCycles(make.rr(), 3.5, 4);
		expect(half.map((ev) => `${evKey(ev)}@${laneOf(ev)}`)).toEqual(
			whole.map((ev) => `${evKey(ev)}@${laneOf(ev)}`),
		);
	});

	it("before cycle 0 there is no history: packed lanes, rests left out", () => {
		const pat = p`[c4,e4] ~`.voices("rr", 3).ast;
		expect(kindLanes(pat, -1, 0)).toEqual([
			["note", 0],
			["note", 1],
		]);
	});

	it("a note that crosses into cycle 0 keeps its packed lane; a chord that ends at 0 is no history", () => {
		// Each chord lasts two cycles, from odd cycles: the one at -1 rings into cycle 0.
		const crossing = p`[c4,e4]`.slow(2).late(1).voices("rr", 3).ast;
		expect(lanes(crossing, 0, 1)).toEqual([[60, 0], [64, 1]]);
		expect(lanes(crossing, 1, 2)).toEqual([[60, 0], [64, 1]]);
		expect(lanes(crossing, 3, 4)).toEqual([[60, 2], [64, 0]]);
		// Cycle -1 is the last chord, ending at 0; cycle 0 still starts from empty lanes.
		const edge = p`<[c4,e4] [e4,g4]>`.voices("stable").ast;
		expect(lanes(edge, 0, 1)).toEqual([[60, 0], [64, 1]]);
	});

	it("a continuous signal has no onsets: a loud error", () => {
		const pat: Pat = { op: "voices", policy: "stable", n: 1, child: { op: "signal", kind: "sine" } };
		expect(() => queryCycles(pat, 0, 1)).toThrow(/continuous signal/);
	});
});

describe("cost", () => {
	it("a cold read at cycle 10 000 replays within the bound, and a second read is cached", () => {
		const pat = p`<[c4,e4,g4] [a3,c4,f4] [g3,b3,d4]> g4 [b4 d5]`.voices("stable").ast;
		const t0 = performance.now();
		const first = cycleKeys(pat, 10_000);
		const cold = performance.now() - t0;
		const t1 = performance.now();
		const second = cycleKeys(pat, 10_000);
		const warm = performance.now() - t1;
		console.log(`voices history: cold read of cycle 10000 ${cold.toFixed(0)} ms, cached ${warm.toFixed(2)} ms`);
		expect(second).toEqual(first);
		expect(cold).toBeLessThan(3000);
		expect(warm).toBeLessThan(5);
	});
});
