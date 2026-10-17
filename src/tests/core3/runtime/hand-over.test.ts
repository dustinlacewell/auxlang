/**
 * The swap's state hand-over (runtime/hand-over/): carried values are copied
 * into lane states built ahead, without allocating; the engine-injected
 * fields stay the new engine's; the random stream carries unless the seed
 * changed; a lane that does not fit stays fresh.
 */

import { applyCarry, planCarry } from "@/core3/runtime/hand-over/carry-states";
import { copyInto } from "@/core3/runtime/hand-over/copy-into";
import { describe, expect, it } from "vitest";

describe("copyInto", () => {
	it("copies values into the destination's own objects", () => {
		const buf = new Float32Array(2);
		const inner = { x: 0, ys: [0, 0] };
		const dst: Record<string, unknown> = { a: 0, buf, inner, list: [{ v: 0 }] };
		const src = {
			a: 1,
			buf: new Float32Array([2, 3]),
			inner: { x: 4, ys: [5, 6] },
			list: [{ v: 7 }],
		};
		copyInto(dst, src, new Set());
		expect(dst).toEqual(src);
		expect(dst.buf).toBe(buf);
		expect(dst.inner).toBe(inner);
		expect(inner.ys).toEqual([5, 6]);
	});

	it("skips the named keys", () => {
		const dst = { a: 0, b: 0 };
		copyInto(dst, { a: 1, b: 2 }, new Set(["b"]));
		expect(dst).toEqual({ a: 1, b: 0 });
	});
});

describe("planCarry, applyCarry: shape C (writes)", () => {
	const shapeCLane = (phase: number, gain: number, buf: readonly number[], seed = 1) => ({
		phase,
		gain,
		buf: new Float32Array(buf),
		__lane: 0,
		__seed: seed,
		__rng: { s: phase },
	});
	const carry = (fresh: Record<string, unknown>[], old: Record<string, unknown>[] | undefined) =>
		applyCarry(planCarry(fresh, old, ["phase", "buf"]));

	it("carries the written fields, rebuilds the read-only field fresh", () => {
		const fresh = shapeCLane(0, 0.25, [0, 0]);
		carry([fresh], [shapeCLane(5, 0.5, [1, 2])]);
		expect(fresh.phase).toBe(5); // written: carried
		expect([...fresh.buf]).toEqual([1, 2]); // written: carried
		expect(fresh.gain).toBe(0.25); // read-only: rebuilt from the fresh setup, not carried
	});

	it("starts the lane fresh when a written buffer resizes", () => {
		const fresh = shapeCLane(0, 0.25, [0, 0, 0]);
		carry([fresh], [shapeCLane(5, 0.5, [1, 2])]);
		expect(fresh.phase).toBe(0);
		expect([...fresh.buf]).toEqual([0, 0, 0]);
	});

	it("carries __rng by default, regardless of writes", () => {
		const fresh = shapeCLane(0, 0.25, [0, 0]);
		carry([fresh], [shapeCLane(5, 0.5, [1, 2])]);
		expect(fresh.__rng).toEqual({ s: 5 });
	});

	it("keeps the fresh stream when the seed changed", () => {
		const fresh = shapeCLane(0, 0.25, [0, 0], 2);
		carry([fresh], [shapeCLane(5, 0.5, [1, 2], 1)]);
		expect(fresh.phase).toBe(5);
		expect(fresh.__rng).toEqual({ s: 0 });
		expect(fresh.__seed).toBe(2);
	});

	it("leaves an unpaired node fresh", () => {
		const unpaired = shapeCLane(0, 0.25, [0, 0]);
		carry([unpaired], undefined);
		expect(unpaired.phase).toBe(0);
	});
});
