import { describe, expect, it } from "vitest";

import { fastcat, pure, timecat } from "@/pattern/combinators";
import { evSet, onsetKeys, queryCycles } from "./helpers";

describe("timecat", () => {
	it("divides the cycle by weight: [2, a] [1, b] gives a two thirds", () => {
		const evs = queryCycles(
			timecat([
				[2, pure(1)],
				[1, pure(2)],
			]),
			0,
			1,
		);
		expect(onsetKeys(evs)).toEqual(["0/1", "2/3"]);
		expect(evs.map((ev) => ev.value)).toEqual([1, 2]);
	});

	it("with unit weights it is fastcat", () => {
		const a = timecat([
			[1, pure(1)],
			[1, pure(2)],
		]);
		expect(evSet(queryCycles(a, 0, 3))).toEqual(
			evSet(queryCycles(fastcat([pure(1), pure(2)]), 0, 3)),
		);
	});

	it("takes rational weights", () => {
		const evs = queryCycles(
			timecat([
				[3 / 2, pure(1)],
				[1, pure(2)],
			]),
			0,
			1,
		);
		expect(onsetKeys(evs)).toEqual(["0/1", "3/5"]);
	});

	it("rejects an empty list and non-positive weights", () => {
		expect(() => timecat([])).toThrow(/at least one child/);
		expect(() => timecat([[0, pure(1)]])).toThrow(/positive/);
	});
});
