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

describe("planCarry, applyCarry", () => {
	const lane = (phase: number, seed: number, rng: number) => ({
		phase,
		buf: new Float32Array([phase, phase]),
		__lane: 0,
		__scratch: { table: phase },
		__seed: seed,
		__rng: { s: rng },
	});
	const carry = (fresh: Record<string, unknown>[], old: Record<string, unknown>[] | undefined) =>
		applyCarry(planCarry(fresh, old));

	it("carries values and the stream, keeps the engine's fields", () => {
		const fresh = lane(0, 1, 0);
		const scratch = fresh.__scratch;
		carry([fresh], [{ ...lane(5, 1, 9), __lane: 3 }]);
		expect(fresh.phase).toBe(5);
		expect([...fresh.buf]).toEqual([5, 5]);
		expect(fresh.__rng).toEqual({ s: 9 });
		expect(fresh.__scratch).toBe(scratch);
		expect(fresh.__scratch).toEqual({ table: 0 });
		expect(fresh.__lane).toBe(0);
	});

	it("keeps the fresh stream when the seed changed", () => {
		const fresh = lane(0, 2, 0);
		carry([fresh], [lane(5, 1, 9)]);
		expect(fresh.phase).toBe(5);
		expect(fresh.__rng).toEqual({ s: 0 });
		expect(fresh.__seed).toBe(2);
	});

	it("leaves a lane that does not fit, a lane the old node lacks, and an unpaired node, fresh", () => {
		const resized = { ...lane(0, 1, 0), buf: new Float32Array(3) };
		const extra = lane(0, 1, 0);
		const unpaired = lane(0, 1, 0);
		carry([resized, extra], [lane(5, 1, 9)]);
		carry([unpaired], undefined);
		expect([resized.phase, extra.phase, unpaired.phase]).toEqual([0, 0, 0]);
	});
});
