import { describe, expect, it } from "vitest";

import { fastcat, pure, tieNext, tiePrev } from "@/core3/pattern/combinators";
import { isOnset } from "@/core3/pattern/event";
import { queryCycles } from "./helpers";

describe("tie flags", () => {
	it("tieNext flags every emitted event", () => {
		const evs = queryCycles(tieNext(pure(1)), 0, 2);
		expect(evs).toHaveLength(2);
		for (const ev of evs) {
			expect(ev.tieNext).toBe(true);
			expect(ev.tiePrev).toBeUndefined();
		}
	});

	it("tiePrev flags events and suppresses their onsets", () => {
		const evs = queryCycles(tiePrev(pure(1)), 0, 1);
		expect(evs).toHaveLength(1);
		expect(evs[0]!.tiePrev).toBe(true);
		expect(isOnset(evs[0]!)).toBe(false);
	});

	it("a_b: first sounds through, second does not retrigger", () => {
		const pat = fastcat([tieNext(pure(60)), tiePrev(pure(60))]);
		const evs = queryCycles(pat, 0, 1);
		expect(evs).toHaveLength(2);
		expect(evs[0]!.tieNext).toBe(true);
		expect(isOnset(evs[0]!)).toBe(true);
		expect(evs[1]!.tiePrev).toBe(true);
		expect(isOnset(evs[1]!)).toBe(false);
	});

	it("flags pass through time transforms", () => {
		const pat = fastcat([tieNext(pure(1)), tiePrev(pure(2))]);
		const evs = queryCycles({ op: "fast", factor: { n: 2, d: 1 }, child: pat }, 0, 0.5);
		expect(evs[0]!.tieNext).toBe(true);
		expect(evs[1]!.tiePrev).toBe(true);
	});
});
