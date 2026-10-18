import { describe, expect, it } from "vitest";

import { P } from "@/pattern/pat-class";
import { r } from "@/pattern/rational";
import { tactus } from "@/pattern/tactus";

describe("tactus: steps per cycle from structure", () => {
	it("a single event is one step", () => {
		expect(tactus(P.stack(1).ast)).toEqual(r(1));
	});

	it("fastcat counts its children", () => {
		expect(tactus(P.fastcat(1, 2, 3).ast)).toEqual(r(3));
	});

	it("timecat sums its weights", () => {
		expect(tactus(P.timecat([2, 1], [1, 2]).ast)).toEqual(r(3));
		expect(tactus(P.timecat([3 / 2, 1], [1, 2]).ast)).toEqual(r(5, 2));
	});

	it("stack and cat take the least common multiple", () => {
		expect(tactus(P.stack(P.fastcat(1, 2), P.fastcat(1, 2, 3)).ast)).toEqual(r(6));
		expect(tactus(P.cat(P.fastcat(1, 2), P.fastcat(1, 2, 3, 4)).ast)).toEqual(r(4));
	});

	it("polymeter plays its first layer's steps", () => {
		expect(tactus(P.polymeter(P.fastcat(1, 2, 3), P.fastcat(1, 2)).ast)).toEqual(r(3));
	});

	it("ply multiplies; euclid and segment count their own steps", () => {
		expect(tactus(P.fastcat(1, 2).ply(3).ast)).toEqual(r(6));
		expect(tactus(P.fastcat(1, 2).euclid(3, 8).ast)).toEqual(r(8));
		expect(tactus(P.fastcat(1, 2).segment(4).ast)).toEqual(r(4));
	});

	it("fast and slow change speed, not the step count", () => {
		expect(tactus(P.fastcat(1, 2, 3).fast(2).ast)).toEqual(r(3));
		expect(tactus(P.fastcat(1, 2, 3).slow(2).ast)).toEqual(r(3));
	});
});
