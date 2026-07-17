import { describe, expect, it } from "vitest";

import { fastcat, pure, stack, wchild } from "@/core3/pattern/combinators";
import { isOnset } from "@/core3/pattern/event";
import { r, radd, req } from "@/core3/pattern/rational";
import { queryCycles } from "./helpers";

describe("pure", () => {
	it("emits one event per cycle spanning the whole cycle", () => {
		const evs = queryCycles(pure(7), 0, 3);
		expect(evs).toHaveLength(3);
		evs.forEach((ev, c) => {
			expect(ev.whole).not.toBeNull();
			expect(req(ev.whole!.begin, r(c))).toBe(true);
			expect(req(ev.whole!.end, r(c + 1))).toBe(true);
			expect(req(ev.part.begin, r(c))).toBe(true);
			expect(req(ev.part.end, r(c + 1))).toBe(true);
			expect(ev.value).toBe(7);
			expect(isOnset(ev)).toBe(true);
		});
	});

	it("clips part to the query span; clipped fragment is not an onset", () => {
		const evs = queryCycles(pure(1), 0.25, 0.5);
		expect(evs).toHaveLength(1);
		const ev = evs[0]!;
		expect(req(ev.whole!.begin, r(0))).toBe(true);
		expect(req(ev.whole!.end, r(1))).toBe(true);
		expect(req(ev.part.begin, r(1, 4))).toBe(true);
		expect(req(ev.part.end, r(1, 2))).toBe(true);
		expect(isOnset(ev)).toBe(false);
	});
});

describe("fastcat subdivision exactness", () => {
	it("triplets land on exact thirds, every cycle, no drift", () => {
		const trip = fastcat([pure(0), pure(1), pure(2)]);
		for (const cycle of [0, 1, 7, 100]) {
			const evs = queryCycles(trip, cycle, cycle + 1);
			expect(evs).toHaveLength(3);
			evs.forEach((ev, i) => {
				expect(req(ev.whole!.begin, radd(r(cycle), r(i, 3)))).toBe(true);
				expect(req(ev.whole!.end, radd(r(cycle), r(i + 1, 3)))).toBe(true);
				expect(ev.value).toBe(i);
			});
		}
	});

	it("triplets against quintuplets stay exact when stacked", () => {
		const trip = fastcat([pure(0), pure(1), pure(2)]);
		const quint = fastcat([pure(10), pure(11), pure(12), pure(13), pure(14)]);
		const evs = queryCycles(stack([trip, quint]), 100, 101);
		expect(evs).toHaveLength(8);
		const trips = evs.filter((ev) => ev.value < 10);
		const quints = evs.filter((ev) => ev.value >= 10);
		trips.forEach((ev, i) => {
			expect(req(ev.part.begin, radd(r(100), r(i, 3)))).toBe(true);
		});
		quints.forEach((ev, i) => {
			expect(req(ev.part.begin, radd(r(100), r(i, 5)))).toBe(true);
		});
	});

	it("weighted fastcat: a@3 b divides the cycle 3/4 + 1/4", () => {
		const pat = fastcat([wchild(pure(1), 3), pure(2)]);
		const evs = queryCycles(pat, 0, 1);
		expect(evs).toHaveLength(2);
		expect(req(evs[0]!.whole!.begin, r(0))).toBe(true);
		expect(req(evs[0]!.whole!.end, r(3, 4))).toBe(true);
		expect(evs[0]!.value).toBe(1);
		expect(req(evs[1]!.whole!.begin, r(3, 4))).toBe(true);
		expect(req(evs[1]!.whole!.end, r(1))).toBe(true);
		expect(evs[1]!.value).toBe(2);
	});

	it("a partial query returns only the overlapped slots", () => {
		const trip = fastcat([pure(0), pure(1), pure(2)]);
		const evs = queryCycles(trip, 0, 1 / 2);
		// slots [0,1/3) and [1/3,2/3) overlap [0,1/2)
		expect(evs).toHaveLength(2);
		expect(req(evs[1]!.part.end, r(1, 2))).toBe(true);
		expect(req(evs[1]!.whole!.end, r(2, 3))).toBe(true);
	});
});
