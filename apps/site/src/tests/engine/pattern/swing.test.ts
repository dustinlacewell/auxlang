import { describe, expect, it } from "vitest";

import type { Ev } from "@/engine/pattern/event";
import { p } from "@/engine/pattern/notation/template";
import { P } from "@/engine/pattern/pat-class";
import { width } from "@/engine/pattern/widths";
import { evSet, onsetKeys, queryCycles } from "./helpers";

const rk = (x: { n: number; d: number }) => `${x.n}/${x.d}`;
const wholes = (evs: readonly Ev[]) => evs.map((ev) => `${rk(ev.whole!.begin)}..${rk(ev.whole!.end)}`);

const four = () => P.fastcat(1, 2, 3, 4);

describe("swingBy / swing", () => {
	it("starts the second half of each slot amount/2 of a slot late", () => {
		const evs = queryCycles(four().swingBy(1 / 3, 2).ast, 0, 1);
		expect(onsetKeys(evs)).toEqual(["0/1", "1/3", "1/2", "5/6"]);
	});

	it("bends time so events stay touching: the on-beat grows, the off-beat shrinks", () => {
		const evs = queryCycles(four().swingBy(1 / 3, 2).ast, 0, 1);
		expect(wholes(evs)).toEqual(["0/1..1/3", "1/3..1/2", "1/2..5/6", "5/6..1/1"]);
	});

	it("swing(n) is swingBy(1/3, n): eighths under swing(4) shuffle in triplets", () => {
		const eighths = P.fastcat(1, 2, 3, 4, 5, 6, 7, 8);
		expect(evSet(queryCycles(eighths.swing(4).ast, 0, 2))).toEqual(
			evSet(queryCycles(eighths.swingBy(1 / 3, 4).ast, 0, 2)),
		);
		expect(onsetKeys(queryCycles(eighths.swing(4).ast, 0, 1)).slice(0, 4)).toEqual([
			"0/1",
			"1/6",
			"1/4",
			"5/12",
		]);
	});

	it("amount 0 is the identity", () => {
		const pat = P.fastcat(1, P.cat(2, 3), 4);
		expect(evSet(queryCycles(pat.swingBy(0, 4).ast, 0, 4))).toEqual(evSet(queryCycles(pat.ast, 0, 4)));
	});

	it("a negative amount pulls the off-beats early", () => {
		expect(onsetKeys(queryCycles(four().swingBy(-1 / 3, 2).ast, 0, 1))).toEqual([
			"0/1",
			"1/6",
			"1/2",
			"2/3",
		]);
	});

	it("a typed decimal rounds to a small fraction", () => {
		expect(onsetKeys(queryCycles(four().swingBy(0.3333333, 2).ast, 0, 1))[1]).toBe("1/3");
	});

	it("a partial query returns the same pieces as the full cycle", () => {
		const pat = four().swingBy(1 / 3, 2).ast;
		const halves = [...queryCycles(pat, 0, 0.25), ...queryCycles(pat, 0.25, 1)];
		expect(onsetKeys(halves)).toEqual(onsetKeys(queryCycles(pat, 0, 1)));
	});

	it("keeps width, ties and slides", () => {
		const chords = p`[c3, e3] [g3, b3]`;
		expect(width(chords.swing(2).ast)).toBe(width(chords.ast));
		const line = p`c3 _ d3_e3 ~`;
		const tied = queryCycles(line.swingBy(1 / 3, 2).ast, 0, 1);
		expect(tied.map((ev) => ev.kind)).toEqual(queryCycles(line.ast, 0, 1).map((ev) => ev.kind));
		for (let i = 1; i < tied.length; i++) {
			expect(rk(tied[i]!.whole!.begin)).toBe(rk(tied[i - 1]!.whole!.end));
		}
	});

	it("drops the same notes as the straight pattern under degrade", () => {
		const pat = P.fastcat(1, 2, 3, 4, 5, 6, 7, 8).degrade(0.5);
		const kinds = (evs: readonly Ev[]) => evs.map((ev) => ev.kind);
		expect(kinds(queryCycles(pat.swing(4).ast, 0, 4, 7))).toEqual(kinds(queryCycles(pat.ast, 0, 4, 7)));
	});

	it("rejects an amount outside (-1, 1) and a bad n", () => {
		expect(() => four().swingBy(1, 2)).toThrow(/amount must be in \(-1, 1\)/);
		expect(() => four().swingBy(Number.NaN, 2)).toThrow(/amount/);
		expect(() => four().swing(0)).toThrow(/positive integer/);
	});
});
