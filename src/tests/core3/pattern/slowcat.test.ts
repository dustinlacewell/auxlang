import { describe, expect, it } from "vitest";

import { fastcat, pure, slowcat } from "@/core3/pattern/combinators";
import { r, req } from "@/core3/pattern/rational";
import { queryCycles } from "./helpers";

describe("slowcat", () => {
	it("plays one child per cycle, round-robin", () => {
		const pat = slowcat([pure(1), pure(2), pure(3)]);
		const values = queryCycles(pat, 0, 6).map((ev) => ev.value);
		expect(values).toEqual([1, 2, 3, 1, 2, 3]);
	});

	it("each cycle's event spans that full cycle", () => {
		const pat = slowcat([pure(1), pure(2)]);
		const evs = queryCycles(pat, 0, 4);
		evs.forEach((ev, c) => {
			expect(req(ev.whole!.begin, r(c))).toBe(true);
			expect(req(ev.whole!.end, r(c + 1))).toBe(true);
		});
	});

	it("nested slowcat sees contiguous cycles, so inner alternation advances", () => {
		// <a <b c>> over 4 cycles: a b a c
		const pat = slowcat([pure(1), slowcat([pure(2), pure(3)])]);
		const values = queryCycles(pat, 0, 4).map((ev) => ev.value);
		expect(values).toEqual([1, 2, 1, 3]);
	});

	it("inner fastcat is placed in the correct cycle", () => {
		const pat = slowcat([pure(0), fastcat([pure(1), pure(2)])]);
		const evs = queryCycles(pat, 1, 2);
		expect(evs).toHaveLength(2);
		expect(req(evs[0]!.whole!.begin, r(1))).toBe(true);
		expect(req(evs[0]!.whole!.end, r(3, 2))).toBe(true);
		expect(req(evs[1]!.whole!.begin, r(3, 2))).toBe(true);
		expect(evs.map((ev) => ev.value)).toEqual([1, 2]);
	});
});
