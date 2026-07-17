import { describe, expect, it } from "vitest";

import { bjorklund } from "@/core3/pattern/bjorklund";
import { euclid, pure } from "@/core3/pattern/combinators";
import { r, req, rsub } from "@/core3/pattern/rational";
import { onsetKeys, onsets, queryCycles } from "./helpers";

describe("bjorklund", () => {
	it("E(3,8) = x..x..x.", () => {
		expect(bjorklund(3, 8)).toEqual([true, false, false, true, false, false, true, false]);
	});

	it("E(5,8) = x.xx.xx.", () => {
		expect(bjorklund(5, 8)).toEqual([true, false, true, true, false, true, true, false]);
	});

	it("handles the edges", () => {
		expect(bjorklund(0, 4)).toEqual([false, false, false, false]);
		expect(bjorklund(4, 4)).toEqual([true, true, true, true]);
	});
});

describe("euclid", () => {
	it("euclid(3,8) fires 3 onsets per cycle at 0, 3/8, 6/8", () => {
		const evs = queryCycles(euclid(3, 8, 0, pure(1)), 0, 1);
		expect(onsets(evs)).toHaveLength(3);
		expect(onsetKeys(evs)).toEqual(["0/1", "3/8", "3/4"]);
	});

	it("each hit occupies exactly one step", () => {
		const evs = queryCycles(euclid(3, 8, 0, pure(1)), 0, 1);
		for (const ev of evs) {
			expect(req(rsub(ev.whole!.end, ev.whole!.begin), r(1, 8))).toBe(true);
		}
	});

	it("rotation shifts which steps fire: euclid(3,8,2) at 1/8, 4/8, 6/8", () => {
		const evs = queryCycles(euclid(3, 8, 2, pure(1)), 0, 1);
		expect(onsetKeys(evs)).toEqual(["1/8", "1/2", "3/4"]);
	});

	it("onset count holds across cycles", () => {
		const evs = queryCycles(euclid(5, 8, 0, pure(1)), 0, 10);
		expect(onsets(evs)).toHaveLength(50);
	});
});
