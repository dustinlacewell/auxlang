/**
 * Static width (§3.2): computed from structure, never by querying. And the
 * lanes query assigns always fit inside it: below the width, and never two
 * overlapping events in one lane.
 */

import { describe, expect, it } from "vitest";

import { silence } from "@/core3/pattern/combinators";
import type { Ev } from "@/core3/pattern/event";
import { laneOf } from "@/core3/pattern/event";
import { p } from "@/core3/pattern/notation/template";
import { P } from "@/core3/pattern/pat-class";
import { rlt } from "@/core3/pattern/rational";
import { width } from "@/core3/pattern/widths";
import { queryCycles } from "./helpers";

const chord = () => P.stack(1, 2, 3);

describe("width rules", () => {
	it("stack sums its children", () => {
		expect(width(P.stack(P.fastcat(1, 2), chord()).ast)).toBe(4);
	});

	it("a sequence takes the max of its children", () => {
		expect(width(P.fastcat(1, chord(), P.stack(4, 5)).ast)).toBe(3);
		expect(width(P.cat(1, chord(), P.stack(4, 5)).ast)).toBe(3);
	});

	it("timecat takes the max of its children", () => {
		expect(width(P.timecat([2, chord()], [1, P.stack(4, 5)]).ast)).toBe(3);
	});

	it("polymeter sums its layers", () => {
		expect(width(P.polymeter(P.fastcat(1, 2, 3), chord()).ast)).toBe(4);
	});

	it("every takes the max of both branches", () => {
		expect(width(P.fastcat(1, 2).every(2, () => chord()).ast)).toBe(3);
		expect(width(chord().every(2, (q) => q.rev()).ast)).toBe(3);
	});

	it("off sums the original and the shifted copy", () => {
		expect(width(chord().off(0.25, (q) => q.add(12)).ast)).toBe(6);
	});

	it("silence needs no lanes, so it adds nothing to a stack", () => {
		expect(width(silence())).toBe(0);
		expect(width(P.stack(new P(silence()), 1).ast)).toBe(1);
	});

	it("a 3-note chord is width 3 under slow(1.4) and slow(800)", () => {
		expect(width(p`c4 d4 e4 [f4,a4,c5]`.slow(1.4).ast)).toBe(3);
		expect(width(p`c4 d4 e4 f4 g4 a4 b4 c5 d5 [e5,g5,b5]`.slow(800).ast)).toBe(3);
	});
});

/** Lanes are below the width, and events in one lane never overlap. */
function expectLanesFit(evs: readonly Ev[], w: number): void {
	for (const ev of evs) expect(laneOf(ev)).toBeLessThan(w);
	for (const a of evs) {
		for (const b of evs) {
			if (a === b || laneOf(a) !== laneOf(b)) continue;
			const overlap = rlt(a.part.begin, b.part.end) && rlt(b.part.begin, a.part.end);
			expect(overlap).toBe(false);
		}
	}
}

describe("query lanes fit the width", () => {
	const cases: [string, P, number, number][] = [
		["slow(1.4) chord", p`c4 d4 e4 [f4,a4,c5]`.slow(1.4), 0, 8],
		["slow(800) final chord", p`c4 d4 e4 f4 g4 a4 b4 c5 d5 [e5,g5,b5]`.slow(800), 715, 725],
		["chords in a sequence", p`[c4,e4] g4 [a4,c5,e5]`, 0, 2],
		["off overlay", chord().off(1 / 8, (q) => q.add(12)), 0, 3],
		["every with a wider branch", P.fastcat(1, 2).every(2, () => chord()), 0, 4],
		["chunk: a held note rings into the slice", P.fastcat(1).chunk(4, (q) => q.fast(4)), 0, 4],
		["held note under a stack", P.stack(p`<~ e4>`, p`c4`.slow(2)), 0, 4],
		["timecat with a chord", P.timecat([2, chord()], [1, 4]), 0, 2],
		["polymeter of a chord and a line", P.polymeter(P.fastcat(1, 2, 3), P.fastcat(chord(), 5)), 0, 3],
	];

	for (const [name, pat, from, to] of cases) {
		it(name, () => {
			const evs = queryCycles(pat.ast, from, to);
			expect(evs.length).toBeGreaterThan(0);
			expectLanesFit(evs, width(pat.ast));
		});
	}

	it("the slow(800) final chord sounds in lanes 0, 1, 2", () => {
		const pat = p`c4 d4 e4 f4 g4 a4 b4 c5 d5 [e5,g5,b5]`.slow(800);
		const lanes = queryCycles(pat.ast, 750, 751).map((ev) => [ev.value, laneOf(ev)]);
		expect(lanes).toEqual([
			[76, 0],
			[79, 1],
			[83, 2],
		]);
	});
});
