import { describe, expect, it } from "vitest";

import { degrade, fastcat, pure, stack } from "@/core3/pattern/combinators";
import { hash01 } from "@/core3/pattern/random";
import { rcycle } from "@/core3/pattern/rational";
import { evSet, queryCycles } from "./helpers";

describe("hash01", () => {
	it("is deterministic and in [0,1)", () => {
		for (let i = 0; i < 100; i++) {
			const x = hash01(42, 7, i);
			expect(x).toBe(hash01(42, 7, i));
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(1);
		}
	});

	it("varies with each argument", () => {
		expect(hash01(1, 0, 0)).not.toBe(hash01(2, 0, 0));
		expect(hash01(1, 1, 0)).not.toBe(hash01(1, 2, 0));
		expect(hash01(1, 0, 1)).not.toBe(hash01(1, 0, 2));
	});
});

describe("degrade", () => {
	const pat = degrade(0.5, pure(1));

	it("same seed + span twice yields identical events", () => {
		expect(evSet(queryCycles(pat, 0, 50, 42))).toEqual(evSet(queryCycles(pat, 0, 50, 42)));
	});

	it("different seeds yield different survivors", () => {
		expect(evSet(queryCycles(pat, 0, 50, 1))).not.toEqual(evSet(queryCycles(pat, 0, 50, 2)));
	});

	it("keeps events at roughly 1 - prob over 200 cycles", () => {
		const kept = queryCycles(degrade(0.3, pure(1)), 0, 200, 7).length;
		expect(kept / 200).toBeGreaterThan(0.6);
		expect(kept / 200).toBeLessThan(0.8);
	});

	it("prob 0 keeps everything; prob 1 drops everything", () => {
		expect(queryCycles(degrade(0, pure(1)), 0, 20)).toHaveLength(20);
		expect(queryCycles(degrade(1, pure(1)), 0, 20)).toHaveLength(0);
	});

	it("rolls once per event cycle: fragments agree with the full query", () => {
		const two = degrade(0.5, fastcat([pure(1), pure(2)]));
		const full = evSet(queryCycles(two, 0, 1, 9));
		const halves = evSet([...queryCycles(two, 0, 0.5, 9), ...queryCycles(two, 0.5, 1, 9)]);
		expect(halves).toEqual(full);
	});

	it("distinct AST positions roll independently", () => {
		const pat2 = stack([degrade(0.5, pure(1)), degrade(0.5, pure(2))]);
		const evs = queryCycles(pat2, 0, 64, 5);
		const cyclesOf = (v: number) =>
			evs
				.filter((ev) => ev.value === v)
				.map((ev) => rcycle(ev.whole!.begin))
				.join(",");
		expect(cyclesOf(1)).not.toEqual(cyclesOf(2));
	});

	it("drops individual events, not the whole cycle: partial drops exist", () => {
		// A 4-note degraded sequence over 64 cycles. If degrade were all-or-
		// nothing per cycle, every cycle would have exactly 0 or 4 survivors.
		// Per-event rolling means some cycles keep 1, 2, or 3.
		const four = degrade(0.5, fastcat([pure(1), pure(2), pure(3), pure(4)]));
		const perCycle = new Map<number, number>();
		for (const ev of queryCycles(four, 0, 64, 11)) {
			const c = rcycle(ev.whole!.begin);
			perCycle.set(c, (perCycle.get(c) ?? 0) + 1);
		}
		const counts = [...perCycle.values()];
		const partial = counts.filter((n) => n > 0 && n < 4);
		expect(partial.length).toBeGreaterThan(0);
	});

	it("keeps events at roughly 1 - prob across many events in a sequence", () => {
		// 4 events/cycle * 64 cycles = 256 events; keep-rate within +/-10% of 0.5.
		const four = degrade(0.5, fastcat([pure(1), pure(2), pure(3), pure(4)]));
		const kept = queryCycles(four, 0, 64, 11).length;
		const total = 4 * 64;
		expect(kept / total).toBeGreaterThan(0.4);
		expect(kept / total).toBeLessThan(0.6);
	});

	it("per-event degrade is deterministic across identical queries", () => {
		const four = degrade(0.5, fastcat([pure(1), pure(2), pure(3), pure(4)]));
		expect(evSet(queryCycles(four, 0, 64, 11))).toEqual(evSet(queryCycles(four, 0, 64, 11)));
	});
});
