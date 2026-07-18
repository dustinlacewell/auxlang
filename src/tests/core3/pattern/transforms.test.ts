import { describe, expect, it } from "vitest";

import { fastcat, pure, slowcat } from "@/core3/pattern/combinators";
import { P } from "@/core3/pattern/pat-class";
import { r, req } from "@/core3/pattern/rational";
import { evSet, onsetKeys, onsets, queryCycles } from "./helpers";

const abc = () => P.fastcat(1, 2, 3);

describe("fast / slow", () => {
	it("fast(2) squeezes two copies into one cycle", () => {
		const evs = queryCycles(abc().fast(2).ast, 0, 1);
		expect(evs.map((ev) => ev.value)).toEqual([1, 2, 3, 1, 2, 3]);
		expect(req(evs[3]!.whole!.begin, r(1, 2))).toBe(true);
	});

	it("fast(2) then slow(2) is the identity over 4 cycles", () => {
		const pat = P.fastcat(1, 2, P.cat(3, 4));
		expect(evSet(queryCycles(pat.fast(2).slow(2).ast, 0, 4))).toEqual(
			evSet(queryCycles(pat.ast, 0, 4)),
		);
	});
});

describe("rev", () => {
	it("reverses within each cycle", () => {
		const evs = queryCycles(abc().rev().ast, 0, 1);
		expect(evs.map((ev) => ev.value)).toEqual([3, 2, 1]);
		expect(req(evs[0]!.whole!.begin, r(0))).toBe(true);
		expect(req(evs[0]!.whole!.end, r(1, 3))).toBe(true);
	});

	it("rev of rev is the identity over 4 cycles", () => {
		const pat = P.fastcat(1, P.cat(2, 3), 4);
		expect(evSet(queryCycles(pat.rev().rev().ast, 0, 4))).toEqual(
			evSet(queryCycles(pat.ast, 0, 4)),
		);
	});
});

describe("early / late", () => {
	it("late(1/4) rotates onsets later", () => {
		const evs = queryCycles(P.fastcat(1, 2).late(r(1, 4)).ast, 0, 1);
		expect(onsetKeys(evs)).toEqual(["1/4", "3/4"]);
	});

	it("early(1/4) then late(1/4) restores the original onsets", () => {
		// Under Tidal rotation semantics each shift splits at a cycle boundary, so
		// the round-trip may fragment an event's `part` into abutting pieces that
		// share one `whole`. Onset identity (whole + value) round-trips exactly.
		const pat = abc();
		const roundTrip = pat.early(r(1, 4)).late(r(1, 4));
		const rk = (x: { n: number; d: number }) => `${x.n}/${x.d}`;
		const wholes = (evs: ReturnType<typeof queryCycles>) =>
			onsets(evs)
				.map((ev) => `${rk(ev.whole!.begin)}..${rk(ev.whole!.end)}|${ev.value}`)
				.sort();
		expect(wholes(queryCycles(roundTrip.ast, 0, 2))).toEqual(wholes(queryCycles(pat.ast, 0, 2)));
	});
});

describe("iter", () => {
	it("shifts the starting point by i/n on cycle i", () => {
		const pat = P.fastcat(1, 2, 3, 4).iter(4).ast;
		const firstValue = (c: number) => queryCycles(pat, c, c + 1)[0]!.value;
		expect([0, 1, 2, 3, 4, 5].map(firstValue)).toEqual([1, 2, 3, 4, 1, 2]);
	});
});

describe("every", () => {
	it("applies the transform on cycles 0, 4, 8 only", () => {
		const pat = P.fastcat(1, 2, 3, 4).every(4, (q) => q.rev()).ast;
		const firstValue = (c: number) => queryCycles(pat, c, c + 1)[0]!.value;
		for (let c = 0; c <= 9; c++) {
			expect(firstValue(c)).toBe(c % 4 === 0 ? 4 : 1);
		}
	});

	it("builds the transformed branch at construction time", () => {
		const built = P.fastcat(1, 2).every(2, (q) => q.rev()).ast;
		expect(built.op).toBe("every");
		if (built.op === "every") expect(built.transformed.op).toBe("rev");
	});
});

describe("ply", () => {
	it("repeats each event within its own span", () => {
		const evs = queryCycles(P.fastcat(1, 2).ply(2).ast, 0, 1);
		expect(evs.map((ev) => ev.value)).toEqual([1, 1, 2, 2]);
		expect(onsetKeys(evs)).toEqual(["0/1", "1/4", "1/2", "3/4"]);
		expect(req(evs[1]!.whole!.begin, r(1, 4))).toBe(true);
		expect(req(evs[1]!.whole!.end, r(1, 2))).toBe(true);
	});
});

describe("add / mul", () => {
	it("maps over payloads", () => {
		expect(queryCycles(P.fastcat(60, 64).add(12).ast, 0, 1).map((ev) => ev.value)).toEqual([
			72, 76,
		]);
		expect(queryCycles(pure(3), 0, 1).map((ev) => ev.value)).toEqual([3]);
		expect(queryCycles(P.stack(3).mul(2).ast, 0, 1).map((ev) => ev.value)).toEqual([6]);
	});
});

describe("off", () => {
	it("overlays a transformed copy shifted later", () => {
		// The shifted copy rotates as an infinite stream, so cycle 0 also shows the
		// wrapped-in tail of the previous cycle as a non-onset fragment; assert on
		// onsets to see the copy's true attacks.
		const evs = queryCycles(P.fastcat(60, 62).off(r(1, 8), (q) => q.add(12)).ast, 0, 1);
		const originals = onsets(evs.filter((ev) => ev.value < 70));
		const copies = onsets(evs.filter((ev) => ev.value >= 70));
		expect(originals.map((ev) => ev.value)).toEqual([60, 62]);
		expect(copies.map((ev) => ev.value)).toEqual([72, 74]);
		expect(onsetKeys(originals)).toEqual(["0/1", "1/2"]);
		expect(onsetKeys(copies)).toEqual(["1/8", "5/8"]);
	});
});

describe("multi-cycle queries", () => {
	it("querying [0,4) equals the union of per-cycle queries", () => {
		const pat = fastcat([pure(1), slowcat([pure(2), pure(3)])]);
		const whole = evSet(queryCycles(pat, 0, 4));
		const parts = evSet([0, 1, 2, 3].flatMap((c) => queryCycles(pat, c, c + 1)));
		expect(whole).toEqual(parts);
	});
});
