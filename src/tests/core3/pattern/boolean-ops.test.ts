/**
 * Boolean-driven and generative combinators: mask/struct/segment/clip/chunk/
 * sometimesBy, plus the continuous rand/perlin signals. These are the vocabulary
 * the coastline port leans on; each is verified against exact event output.
 */

import { describe, expect, it } from "vitest";

import { P } from "@/core3/pattern/pat-class";
import { r, rtof } from "@/core3/pattern/rational";
import { queryCycles } from "./helpers";

const notes = () => P.fastcat(60, 62, 64, 65); // four steps

describe("mask", () => {
	it("keeps only events under a true region", () => {
		const evs = queryCycles(notes().mask(P.fastcat(1, 0, 1, 0)).ast, 0, 1);
		expect(evs.map((e) => e.value)).toEqual([60, 64]);
	});

	it("all-true mask is the identity", () => {
		const evs = queryCycles(notes().mask(P.fastcat(1, 1, 1, 1)).ast, 0, 1);
		expect(evs.map((e) => e.value)).toEqual([60, 62, 64, 65]);
	});
});

describe("struct", () => {
	it("re-triggers the held value at each true step", () => {
		const evs = queryCycles(new P({ op: "pure", value: 60 }).struct(P.fastcat(1, 1, 1, 1)).ast, 0, 1);
		expect(evs.map((e) => e.value)).toEqual([60, 60, 60, 60]);
		expect(evs.length).toBe(4);
	});
});

describe("segment", () => {
	it("samples a pattern into n equal steps", () => {
		const evs = queryCycles(P.fastcat(60, 64).segment(4).ast, 0, 1);
		expect(evs.map((e) => e.value)).toEqual([60, 60, 64, 64]);
	});
});

describe("clip", () => {
	it("scales each event's whole duration", () => {
		const evs = queryCycles(P.fastcat(60, 64).clip(0.5).ast, 0, 1);
		// first step spans [0,0.5); clipped whole ends at 0.25
		expect(rtof(evs[0]!.whole!.end)).toBeCloseTo(0.25, 6);
		expect(rtof(evs[1]!.whole!.end)).toBeCloseTo(0.75, 6);
	});
});

describe("chunk", () => {
	it("transforms a rotating 1/n slice per cycle", () => {
		const pat = notes().chunk(2, (q) => q.add(12));
		// cycle 0: first half (60,62) +12
		expect(queryCycles(pat.ast, 0, 1).map((e) => e.value)).toEqual([72, 74, 64, 65]);
		// cycle 1: second half (64,65) +12
		expect(queryCycles(pat.ast, 1, 2).map((e) => e.value)).toEqual([60, 62, 76, 77]);
	});
});

describe("sometimesBy", () => {
	it("is seeded and deterministic across renders", () => {
		const pat = P.fastcat(60, 60, 60, 60).someBy(0.5, (q) => q.add(12));
		const a = queryCycles(pat.ast, 0, 4, 7).map((e) => e.value);
		const b = queryCycles(pat.ast, 0, 4, 7).map((e) => e.value);
		expect(a).toEqual(b);
	});

	it("always transforms at prob 1, never at prob 0", () => {
		const base = P.fastcat(60, 60);
		expect(queryCycles(base.always((q) => q.add(12)).ast, 0, 1).map((e) => e.value)).toEqual([
			72, 72,
		]);
		expect(queryCycles(base.someBy(0, (q) => q.add(12)).ast, 0, 1).map((e) => e.value)).toEqual([
			60, 60,
		]);
	});
});

describe("rand / perlin signals", () => {
	it("rand.segment(n) yields distinct values within a cycle, in [0,1)", () => {
		const evs = queryCycles(P.signal("rand").segment(4).ast, 0, 1, 3);
		const vals = evs.map((e) => e.value);
		expect(new Set(vals).size).toBe(4);
		for (const v of vals) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThan(1);
	});

	it("range maps a 0..1 signal into [lo,hi]", () => {
		const evs = queryCycles(P.signal("rand").range(60, 72).segment(4).ast, 0, 1, 3);
		for (const e of evs) {
			expect(e.value).toBeGreaterThanOrEqual(60);
			expect(e.value).toBeLessThanOrEqual(72);
		}
	});

	it("perlin is smooth: adjacent segment steps differ by less than a full swing", () => {
		const evs = queryCycles(P.signal("perlin").segment(16).ast, 0, 1, 5).map((e) => e.value);
		for (let n = 1; n < evs.length; n++) {
			expect(Math.abs(evs[n]! - evs[n - 1]!)).toBeLessThan(0.5);
		}
	});
});
